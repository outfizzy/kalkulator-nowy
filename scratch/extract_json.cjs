const fs = require('fs');

const stepFile = '/Users/tomaszfijolek/.gemini/antigravity/brain/20e63f82-96f2-4926-9a1b-32bb237304a9/.system_generated/steps/3101/output.txt';
const fileContent = fs.readFileSync(stepFile, 'utf8');
const data = JSON.parse(fileContent);

const match = data.result.match(/\[\s*\{\s*"contracts":[\s\S]*\}\s*\]/);
if (match) {
  const arr = JSON.parse(match[0]);
  const contracts = arr[0].contracts;
  fs.writeFileSync('scratch/contracts.json', JSON.stringify(contracts, null, 2));
  console.log("Successfully wrote scratch/contracts.json with", contracts.length, "contracts.");
} else {
  console.error("Could not find contracts JSON array in result");
}
