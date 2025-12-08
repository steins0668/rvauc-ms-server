import crypto from "crypto";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let raw;

rl.question("Enter the rfid uid ", (answer) => {
  raw = answer;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  console.log(hash);

  rl.close();
});
