"""
Raksha Multilingual Emergency Classifier Training Script (v2)
Fine-tunes DistilBERT on 583+ multilingual emergency reports across
English, Hindi, Kannada, Hinglish, and Kanglish.
"""

import os
import sys
import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup
from torch.optim import AdamW
from sklearn.model_selection import train_test_split

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend", "models", "raksha_emergency_distilbert"))
os.makedirs(MODEL_DIR, exist_ok=True)

LABEL_LIST = ["MEDICAL", "HARASSMENT", "VIOLENCE", "ACCIDENT", "FIRE", "OTHER"]
LABEL2ID = {label: i for i, label in enumerate(LABEL_LIST)}
ID2LABEL = {i: label for i, label in enumerate(LABEL_LIST)}

class EmergencyDataset(Dataset):
    def __init__(self, texts, labels, severities, tokenizer, max_length=128):
        self.texts = texts
        self.labels = labels
        self.severities = severities
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt"
        )
        
        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "label": torch.tensor(label, dtype=torch.long),
            "severity": torch.tensor(self.severities[idx], dtype=torch.long)
        }

def train(dataset_file="training_data_v2.json", epochs=4, batch_size=16, lr=4e-5):
    print("=" * 65)
    print(f"[*] Training Raksha Emergency Transformer on {dataset_file}")
    print("=" * 65)
    
    data_path = os.path.join(os.path.dirname(__file__), dataset_file)
    with open(data_path, "r", encoding="utf-8") as f:
        samples = json.load(f)
        
    texts = [s["text"] for s in samples]
    labels = [LABEL2ID[s["incident_type"]] for s in samples]
    severities = [s.get("severity", 3) for s in samples]
    
    print(f"Loaded {len(texts)} samples from {dataset_file}.")
    
    train_texts, val_texts, train_labels, val_labels, train_sev, val_sev = train_test_split(
        texts, labels, severities, test_size=0.15, random_state=42, stratify=labels
    )
    print(f"Train set: {len(train_texts)} | Validation set: {len(val_texts)}")
    
    pretrained_name = "distilbert-base-multilingual-cased"
    print(f"\n[+] Loading base architecture: '{pretrained_name}'...")
    tokenizer = AutoTokenizer.from_pretrained(pretrained_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        pretrained_name,
        num_labels=len(LABEL_LIST),
        id2label=ID2LABEL,
        label2id=LABEL2ID
    )
    
    train_dataset = EmergencyDataset(train_texts, train_labels, train_sev, tokenizer)
    val_dataset = EmergencyDataset(val_texts, val_labels, val_sev, tokenizer)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Compute Device: {device}")
    model.to(device)
    
    optimizer = AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    total_steps = len(train_loader) * epochs
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=int(total_steps * 0.1), num_training_steps=total_steps)
    criterion = nn.CrossEntropyLoss()
    
    print(f"\n[+] Training for {epochs} epochs (Batch size={batch_size}, LR={lr})...")
    best_val_acc = 0.0
    
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        correct = 0
        total = 0
        
        for batch in train_loader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            targets = batch["label"].to(device)
            
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            loss = criterion(logits, targets)
            
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            scheduler.step()
            
            total_loss += loss.item()
            preds = torch.argmax(logits, dim=1)
            correct += (preds == targets).sum().item()
            total += targets.size(0)
            
        train_acc = (correct / total) * 100
        avg_loss = total_loss / len(train_loader)
        
        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch["input_ids"].to(device)
                attention_mask = batch["attention_mask"].to(device)
                targets = batch["label"].to(device)
                
                outputs = model(input_ids=input_ids, attention_mask=attention_mask)
                preds = torch.argmax(outputs.logits, dim=1)
                val_correct += (preds == targets).sum().item()
                val_total += targets.size(0)
                
        val_acc = (val_correct / val_total) * 100
        print(f"  Epoch {epoch}/{epochs} | Loss: {avg_loss:.4f} | Train Acc: {train_acc:.1f}% | Val Acc: {val_acc:.1f}%")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            model.save_pretrained(MODEL_DIR)
            tokenizer.save_pretrained(MODEL_DIR)

    print(f"\n[+] Saving final model weights and tokenizer to {MODEL_DIR}...")
    model.save_pretrained(MODEL_DIR)
    tokenizer.save_pretrained(MODEL_DIR)
    
    meta = {
        "dataset_version": "v2",
        "samples_count": len(samples),
        "model_type": "distilbert-base-multilingual-cased",
        "labels": LABEL_LIST,
        "classes": ID2LABEL,
        "best_val_accuracy": best_val_acc,
        "final_val_accuracy": val_acc
    }
    with open(os.path.join(MODEL_DIR, "raksha_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
        
    print("=" * 65)
    print(f"[SUCCESS] Model v2 training complete! Best Val Acc: {best_val_acc:.1f}%")
    print("=" * 65)

if __name__ == "__main__":
    train()
