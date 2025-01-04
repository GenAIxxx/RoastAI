import crypto from "crypto";

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  signature: string;
}

class Wallet {
  private balance: number;
  private address: string;
  private privateKey: string;
  private publicKey: string;
  private transactionHistory: Transaction[];

  constructor() {
    const keyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    this.privateKey = keyPair.privateKey.export({ type: "pkcs1", format: "pem" }).toString();
    this.publicKey = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString();
    this.address = this.generateAddress();
    this.balance = 0;
    this.transactionHistory = [];
  }

  private generateAddress(): string {
    const hash = crypto.createHash("sha256");
    hash.update(this.publicKey);
    return hash.digest("hex").slice(0, 40);
  }

  getBalance(): number {
    return this.balance;
  }

  getAddress(): string {
    return this.address;
  }

  sendFunds(toAddress: string, amount: number): Transaction {
    if (amount > this.balance) {
      throw new Error("Insufficient balance.");
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      from: this.address,
      to: toAddress,
      amount,
      timestamp: Date.now(),
      signature: "",
    };

    transaction.signature = this.signTransaction(transaction);
    this.transactionHistory.push(transaction);
    this.balance -= amount;

    return transaction;
  }

  receiveFunds(transaction: Transaction): void {
    this.validateTransaction(transaction);
    this.transactionHistory.push(transaction);
    this.balance += transaction.amount;
  }

  private signTransaction(transaction: Transaction): string {
    const sign = crypto.createSign("SHA256");
    sign.update(JSON.stringify(transaction));
    return sign.sign(this.privateKey, "hex");
  }

  private validateTransaction(transaction: Transaction): boolean {
    const verify = crypto.createVerify("SHA256");
    verify.update(JSON.stringify(transaction));
    const isValid = verify.verify(this.publicKey, transaction.signature, "hex");
    if (!isValid) {
      throw new Error("Invalid transaction signature.");
    }
    return true;
  }

  getTransactionHistory(): Transaction[] {
    return this.transactionHistory;
  }
}

// Example Usage
const myWallet = new Wallet();
const recipientWallet = new Wallet();

console.log("My Wallet Address:", myWallet.getAddress());
console.log("Recipient Address:", recipientWallet.getAddress());

myWallet.receiveFunds({
  id: "1",
  from: "Genesis",
  to: myWallet.getAddress(),
  amount: 1000,
  timestamp: Date.now(),
  signature: "genesis-signature",
});

console.log("Initial Balance:", myWallet.getBalance());

const tx = myWallet.sendFunds(recipientWallet.getAddress(), 500);
recipientWallet.receiveFunds(tx);

console.log("My Balance:", myWallet.getBalance());
console.log("Recipient Balance:", recipientWallet.getBalance());
