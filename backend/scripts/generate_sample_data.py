"""Generate sample CSV data for testing and development"""
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random
import pandas as pd
import numpy as np

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def generate_transactions_csv(num_rows: int = 500, output_dir: str = "backend/data/") -> str:
    """
    Generate sample transactions.csv with realistic Indian banking data.
    
    Args:
        num_rows: Number of transaction rows to generate
        output_dir: Directory to save CSV
        
    Returns:
        Path to generated CSV
    """
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Indian bank IFSC codes and names
    banks = {
        "HDFC": ["HDFC0000001", "HDFC0000002", "HDFC0000003"],
        "ICICI": ["ICIC0000001", "ICIC0000002", "ICIC0000003"],
        "AXIS": ["UTIB0000001", "UTIB0000002", "UTIB0000003"],
        "SBI": ["SBIN0000001", "SBIN0000002", "SBIN0000003"],
        "KOTAK": ["KKBK0000001", "KKBK0000002", "KKBK0000003"],
    }
    
    # Transaction scenarios (4 types as requested)
    scenarios = ["structuring", "layering", "integration", "smurfing"]
    
    # Pattern types (4 types as requested)
    pattern_types = ["round_tripping", "passthrough", "nested_mule", "cash_accumulation"]
    
    # Transaction channels (realistic Indian channels)
    channels = ["NTD", "ATW", "CHQ", "NEFT", "RTGS", "IMPS"]
    
    # Aadhar locations (major Indian cities)
    aadhar_locations = [
        "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
        "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"
    ]
    
    # Country risk levels
    country_risk_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    
    transactions = []
    base_date = datetime.now() - timedelta(days=365)
    
    for i in range(num_rows):
        # Transaction ID
        txn_id = f"TXN_{i+1:06d}"
        
        # Timestamp - spread across last 365 days
        timestamp = base_date + timedelta(
            days=random.randint(0, 365),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        
        # Account IDs - use consistent set of 50 accounts
        from_account = f"ACC_{random.randint(1, 50):05d}"
        to_account = f"ACC_{random.randint(1, 50):05d}"
        
        # Ensure different from/to accounts
        while to_account == from_account:
            to_account = f"ACC_{random.randint(1, 50):05d}"
        
        # Amount - realistic Indian transaction amounts
        if random.random() < 0.3:  # 30% structuring patterns
            amount = round(random.uniform(40000, 50000), 2)
        elif random.random() < 0.5:  # 20% larger amounts
            amount = round(random.uniform(100000, 500000), 2)
        else:  # 50% regular amounts
            amount = round(random.uniform(5000, 50000), 2)
        
        # Transaction type
        txn_type = random.choice(["Debit", "Credit", "Transfer", "Deposit"])
        
        # Suspicious score (0-100)
        scenario = random.choice(scenarios)
        if scenario == "structuring":
            suspicious_score = round(random.uniform(70, 95), 2)
        elif scenario == "layering":
            suspicious_score = round(random.uniform(60, 85), 2)
        elif scenario == "integration":
            suspicious_score = round(random.uniform(40, 70), 2)
        else:  # smurfing
            suspicious_score = round(random.uniform(75, 95), 2)
        
        # Pattern type
        pattern_type = random.choice(pattern_types)
        
        # Aadhar location
        aadhar_location = random.choice(aadhar_locations)
        
        # Layering analysis
        layering_analysis = "Yes" if suspicious_score > 60 else "No"
        
        # Country risk level
        country_risk_level = random.choice(country_risk_levels)
        
        # Bank details
        bank_name = random.choice(list(banks.keys()))
        ifsc_code = random.choice(banks[bank_name])
        bank_details = f"{bank_name}_{ifsc_code}"
        
        transactions.append({
            "id": txn_id,
            "timestamp": timestamp.isoformat(),
            "from_account": from_account,
            "to_account": to_account,
            "amount": amount,
            "transaction_type": txn_type,
            "suspicious_score": suspicious_score,
            "scenario": scenario,
            "pattern_type": pattern_type,
            "aadhar_location": aadhar_location,
            "layering_analysis": layering_analysis,
            "country_risk_level": country_risk_level,
            "bank_details": bank_details,
        })
    
    # Create DataFrame and save
    df = pd.DataFrame(transactions)
    output_path = os.path.join(output_dir, "transactions.csv")
    df.to_csv(output_path, index=False)
    
    print(f"✓ Generated {num_rows} transactions → {output_path}")
    print(f"  Scenarios: {df['scenario'].value_counts().to_dict()}")
    print(f"  Pattern types: {df['pattern_type'].value_counts().to_dict()}")
    
    return output_path


def generate_account_features_csv(num_accounts: int = 50, output_dir: str = "backend/data/") -> str:
    """
    Generate sample account_features.csv with realistic account risk indicators.
    
    Args:
        num_accounts: Number of accounts to generate
        output_dir: Directory to save CSV
        
    Returns:
        Path to generated CSV
    """
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    accounts = []
    
    for i in range(num_accounts):
        account_id = f"ACC_{i+1:05d}"
        
        # Is frozen - 10% of accounts frozen
        is_frozen = "Yes" if random.random() < 0.1 else "No"
        
        # Unique counterparties - 5-50 typical, high for mules
        if is_frozen == "Yes":
            unique_counterparties = random.randint(30, 100)
        else:
            unique_counterparties = random.randint(5, 50)
        
        # Monthly coefficient of variation (0-1)
        monthly_cv = round(random.uniform(0.1, 0.9), 3)
        
        # Structuring 40k-50k percentage
        if is_frozen == "Yes":
            structuring_pct = round(random.uniform(0.3, 0.8), 3)
        else:
            structuring_pct = round(random.uniform(0.0, 0.3), 3)
        
        # Percentage within 6 hours (velocity indicator)
        pct_within_6h = round(random.uniform(0.1, 0.9), 3)
        
        # Channel percentages (must sum to ~1.0)
        ch_ntd = round(random.uniform(0.1, 0.4), 3)
        ch_atw = round(random.uniform(0.1, 0.4), 3)
        ch_chq = round(random.uniform(0.05, 0.3), 3)
        # Normalize to sum to 1.0
        total_ch = ch_ntd + ch_atw + ch_chq
        ch_ntd = round(ch_ntd / total_ch, 3)
        ch_atw = round(ch_atw / total_ch, 3)
        ch_chq = round(ch_chq / total_ch - 0.001, 3)  # Ensure sum = 1.0
        
        # Sender concentration (0-1, high = risky)
        if unique_counterparties > 50:
            sender_concentration = round(random.uniform(0.2, 0.6), 3)
        else:
            sender_concentration = round(random.uniform(0.05, 0.3), 3)
        
        # Mobile spike ratio (0-1, high = suspicious)
        mobile_spike_ratio = round(random.uniform(0.1, 0.9), 3)
        
        # Days since KYC (0-1000, recent = lower)
        days_since_kyc = random.randint(10, 1000)
        
        # Fan-in ratio (0-1)
        fan_in_ratio = round(random.uniform(0.1, 0.9), 3)
        
        accounts.append({
            "account_id": account_id,
            "is_frozen": is_frozen,
            "unique_counterparties": unique_counterparties,
            "monthly_cv": monthly_cv,
            "structuring_40k_50k_pct": structuring_pct,
            "pct_within_6h": pct_within_6h,
            "ch_ntd_pct": ch_ntd,
            "ch_atw_pct": ch_atw,
            "ch_chq_pct": ch_chq,
            "sender_concentration": sender_concentration,
            "mobile_spike_ratio": mobile_spike_ratio,
            "days_since_kyc": days_since_kyc,
            "fan_in_ratio": fan_in_ratio,
        })
    
    # Create DataFrame and save
    df = pd.DataFrame(accounts)
    output_path = os.path.join(output_dir, "account_features.csv")
    df.to_csv(output_path, index=False)
    
    frozen_count = (df["is_frozen"] == "Yes").sum()
    print(f"\n✓ Generated {num_accounts} account features → {output_path}")
    print(f"  Frozen accounts: {frozen_count}")
    print(f"  Avg counterparties: {df['unique_counterparties'].mean():.1f}")
    print(f"  Avg structuring %: {df['structuring_40k_50k_pct'].mean():.1%}")
    
    return output_path


def main():
    """Generate both sample CSVs"""
    print("Generating sample data for testing...\n")
    
    try:
        generate_transactions_csv(num_rows=500)
        generate_account_features_csv(num_accounts=50)
        print("\n✓ All sample data generated successfully!")
        print("\nYou can now test the API with this sample data.")
        
    except Exception as e:
        print(f"✗ Error generating sample data: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
