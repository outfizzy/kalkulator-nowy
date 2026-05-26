const fs = require('fs');

const stepFile = '/Users/tomaszfijolek/.gemini/antigravity/brain/20e63f82-96f2-4926-9a1b-32bb237304a9/.system_generated/steps/3115/output.txt';
const fileContent = fs.readFileSync(stepFile, 'utf8');
const data = JSON.parse(fileContent);

const match = data.result.match(/\[\s*\{\s*"installations":[\s\S]*\}\s*\]/);
if (match) {
  const arr = JSON.parse(match[0]);
  const installations = arr[0].installations;
  fs.writeFileSync('scratch/installations.json', JSON.stringify(installations, null, 2));
  console.log("Successfully wrote scratch/installations.json with", installations.length, "installations.");
} else {
  console.error("Could not find installations JSON array in result");
}
