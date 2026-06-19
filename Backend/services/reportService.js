const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

exports.generatePDFReport = async (data, mlResults) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const filename = `ForestVision_Report_${Date.now()}.pdf`;
        const uploadsDir = path.join(__dirname, '../uploads');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, filename);
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.fillColor('#2d5a27').fontSize(26).text('ForestVision Analytical Report', { align: 'center', underline: true });
        doc.moveDown();
        doc.fillColor('#000').fontSize(14).text(`Region: ${data.region}`, { bold: true });
        doc.text(`Generated on: ${new Date().toLocaleString()}`);
        doc.moveDown(2);

        // Section 1: Deforestation Risk (Random Forest)
        doc.fillColor('#d9534f').fontSize(20).text('1. Deforestation Risk Analysis', { underline: true });
        doc.moveDown(0.5);
        doc.fillColor('#000').fontSize(12);

        // Handle both legacy nested structure and new flat structure
        const rf = mlResults.randomForest || mlResults;
        const cnn = mlResults.cnn || mlResults.satellite_analysis || {};

        doc.text(`Overall Risk Score: ${((rf.risk_score || 0) * 100).toFixed(1)}%`);
        doc.text(`Analysis Confidence: ${((rf.confidence || 0) * 100).toFixed(1)}%`);

        if (rf.recommended_tree && rf.recommended_tree !== 'General Reforestation' && rf.recommendation_confidence > 0) {
            doc.text(`Recommended Tree Species: ${rf.recommended_tree} (Confidence: ${((rf.recommendation_confidence || 0) * 100).toFixed(0)}%)`);
        }

        doc.moveDown();
        doc.text('Reforestation Recommendations:', { bold: true });
        if (rf.reforestation_recommendations && Array.isArray(rf.reforestation_recommendations)) {
            rf.reforestation_recommendations.forEach(rec => {
                doc.text(`• ${rec}`);
            });
        }
        doc.moveDown(2);

        // Section 2: Forest Loss Trends (GFW)
        doc.fillColor('#f0ad4e').fontSize(20).text('2. Forest Loss Trends', { underline: true });
        doc.moveDown(0.5);
        doc.fillColor('#000').fontSize(12);
        if (rf.forest_loss_trend || rf.trends) {
            const trends = rf.forest_loss_trend || rf.trends;
            doc.text('Predicted Risk Trends:');
            trends.forEach(t => {
                doc.text(`• Year ${t.year}: ${(t.risk * 100).toFixed(1)}% risk`);
            });
        }
        doc.moveDown(2);

        // Section 3: Climate Indicators (NASA POWER)
        doc.fillColor('#5bc0de').fontSize(20).text('3. Climate Indicators', { underline: true });
        doc.moveDown(0.5);
        doc.fillColor('#000').fontSize(12);
        const climateSummary = data.preprocessedData && data.preprocessedData.summary ? data.preprocessedData.summary : {};
        doc.text(`Average Temperature: ${climateSummary.avgTemp ? climateSummary.avgTemp.toFixed(2) : 'N/A'}°C`);
        doc.text(`Total Precipitation: ${climateSummary.totalRain ? climateSummary.totalRain.toFixed(2) : 'N/A'}mm`);
        doc.text(`Average Humidity: ${climateSummary.avgHumidity ? climateSummary.avgHumidity.toFixed(2) : 'N/A'}%`);

        if (climateSummary.ndvi !== undefined) {
            doc.text(`Vegetation Health (NDVI): ${climateSummary.ndvi.toFixed(3)}`);
        }
        if (climateSummary.lst !== undefined) {
            doc.text(`Land Surface Temp (LST): ${climateSummary.lst.toFixed(1)}°C`);
        }
        doc.moveDown(2);

        // Section 4: Risk Zone Stats (Re-numbered)
        if (mlResults.risk_zone_stats) {
            const stats = mlResults.risk_zone_stats;
            doc.fillColor('#d9534f').fontSize(20).text('4. Detailed Risk Map Analysis', { underline: true });
            doc.moveDown(0.5);
            doc.fillColor('#000').fontSize(12);
            doc.text(`Total Zones Analyzed: ${stats.total_zones}`);
            doc.text(`Average Risk Intensity: ${stats.avg_risk}`); // 0-1 scale
            doc.moveDown();
            doc.text('Risk Distribution:', { bold: true });
            doc.text(`• High Risk Areas (Red): ${stats.high_risk_count} zones (${stats.high_risk_pct}%)`, { indent: 10 });
            doc.text(`• Moderate Risk Areas (Yellow): ${stats.medium_risk_count} zones`, { indent: 10 });
            doc.text(`• Low Risk/Safe Areas (Green): ${stats.low_risk_count} zones`, { indent: 10 });
            doc.moveDown(2);
        }

        doc.end();

        stream.on('finish', () => resolve({ filename, filePath }));
        stream.on('error', reject);
    });
};

exports.generateCSVExport = async (dataList) => {
    const fields = [
        { label: 'Region', value: 'region' },
        { label: 'Fetch Date', value: 'fetchTimestamp' },
        { label: 'Source API', value: 'sourceApi' },
        { label: 'Avg Temp (°C)', value: 'preprocessedData.summary.avgTemp' },
        { label: 'Total Rain (mm)', value: 'preprocessedData.summary.totalRain' },
        { label: 'Avg Humidity (%)', value: 'preprocessedData.summary.avgHumidity' },
        { label: 'NDVI', value: 'preprocessedData.summary.ndvi' },
        { label: 'LST (°C)', value: 'preprocessedData.summary.lst' },
        {
            label: 'Risk Score', value: (row) => {
                const rf = row.metadata?.mlResults?.randomForest || row.metadata?.mlResults;
                return rf?.risk_score || 'N/A';
            }
        },
        {
            label: 'Confidence', value: (row) => {
                const rf = row.metadata?.mlResults?.randomForest || row.metadata?.mlResults;
                return rf?.confidence || 'N/A';
            }
        },
        {
            label: 'Recommended Tree', value: (row) => {
                const rf = row.metadata?.mlResults?.randomForest || row.metadata?.mlResults;
                return rf?.recommended_tree || 'N/A';
            }
        },
        {
            label: 'Reforestation Tips', value: (row) => {
                const rf = row.metadata?.mlResults?.randomForest || row.metadata?.mlResults;
                const recs = rf?.reforestation_recommendations || [];
                return recs.join('; ') || 'N/A';
            }
        },
        {
            label: 'High Risk Zones', value: (row) => row.metadata?.mlResults?.risk_zone_stats?.high_risk_count || 0
        },
        {
            label: 'Med Risk Zones', value: (row) => row.metadata?.mlResults?.risk_zone_stats?.medium_risk_count || 0
        },
        {
            label: 'Low Risk Zones', value: (row) => row.metadata?.mlResults?.risk_zone_stats?.low_risk_count || 0
        },
        {
            label: 'Avg Risk Intensity', value: (row) => row.metadata?.mlResults?.risk_zone_stats?.avg_risk || 'N/A'
        }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(dataList);

    const filename = `ForestVision_Export_${Date.now()}.csv`;
    const uploadsDir = path.join(__dirname, '../uploads');

    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, csv);

    return { filename, filePath };
};
