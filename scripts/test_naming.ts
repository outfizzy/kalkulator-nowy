
const sheets = [
    "Markisen - Aufdach ZIP",
    "Markisen - Unterdach ZIP",
    "Markisen - Senkrecht"
];

const processNames = () => {
    sheets.forEach(sheet => {
        const nameLower = sheet.toLowerCase();
        let productCandidate = 'Unknown';
        let category = 'roof';

        if (nameLower.includes('markisen')) {
            category = 'matrix';
            if (nameLower.includes('aufdach')) productCandidate = 'Aufdachmarkise zip';
            else if (nameLower.includes('unterdach')) productCandidate = 'Unterdachmarkise zip';
            else if (nameLower.includes('senkrecht')) productCandidate = 'Zip screen';
            else productCandidate = 'Markisen';
        }

        console.log(`Sheet: "${sheet}" -> Product: "${productCandidate}"`);
    });
};

processNames();
