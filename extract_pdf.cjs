const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('../aluxe_preisliste_202530950-2.pdf');

pdf(dataBuffer).then(function (data) {
    console.log(data.text);
}).catch(function (error) {
    console.error('Error:', error);
});
