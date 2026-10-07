import { jsPDF } from 'jspdf';

/**
 * Generate and download a PDF report for a heart disease risk assessment.
 *
 * @param {Object} assessment
 *   - formData: all 13 clinical inputs
 *   - result: model response object containing logistic_regression
 *   - timestamp: ISO string or date
 */
export function generatePdfReport({ formData, result, timestamp = new Date() }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const isQuick = result?.prediction_type === 'Quick Risk Check' || (!formData?.cp && (formData?.bp !== undefined || formData?.max_hr !== undefined));
  const lr = result?.logistic_regression || result || {};
  const prob = typeof lr.probability === 'number' ? lr.probability : (typeof result?.percentage === 'number' ? result.percentage : 0);
  const riskLevel = lr.risk_level || (prob >= 70 ? 'High Risk' : prob >= 30 ? 'Moderate Risk' : 'Low Risk');
  const predictionClass = lr.prediction === 1 ? 'Positive (Class 1)' : 'Negative (Class 0)';

  const dateStr = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Header Banner
  doc.setFillColor(2, 132, 199); // Brand primary blue
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(
    isQuick ? 'HEART RISK REPORT — QUICK CHECK' : 'HEART DISEASE RISK ASSESSMENT',
    margin + 6,
    y + 10
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    isQuick
      ? 'Preliminary Statistical Estimate • 4-Feature L2 Logistic Regression'
      : 'Comprehensive Statistical Probability Analysis • 13-Feature L2 Logistic Regression',
    margin + 6,
    y + 17
  );

  doc.setFontSize(8);
  doc.text(`Generated: ${dateStr}`, pageWidth - margin - 6, y + 17, { align: 'right' });

  y += 30;

  // Primary Prediction Summary Box
  const isHigh = prob >= 70;
  const isMod = prob >= 30 && prob < 70;
  const badgeColor = isHigh ? [239, 68, 68] : isMod ? [245, 158, 11] : [16, 185, 129];

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    isQuick ? 'QUICK RISK CHECK SUMMARY' : 'RISK ASSESSMENT SUMMARY',
    margin + 6,
    y + 8
  );

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Calculated Risk Probability:', margin + 6, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(`${prob.toFixed(1)}%`, margin + 60, y + 18);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Risk Category:', margin + 6, y + 26);

  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(margin + 60, y + 21, 38, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(riskLevel.toUpperCase(), margin + 79, y + 25.8, { align: 'center' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Mode: ${isQuick ? 'Quick Risk Check (4 Inputs)' : 'Detailed Assessment (13 Inputs)'}`,
    pageWidth - margin - 6,
    y + 26,
    { align: 'right' }
  );

  y += 38;

  // Patient Input Summary
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    isQuick ? 'PATIENT MEASUREMENTS (4 BASIC INDICATORS)' : 'PATIENT CLINICAL INPUTS (13 PARAMETERS)',
    margin,
    y
  );

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  const cpMap = { 1: 'Typical Angina', 2: 'Atypical Angina', 3: 'Non-Anginal', 4: 'Asymptomatic' };
  const thalMap = { 3: 'Normal Blood Flow', 6: 'Fixed Defect', 7: 'Reversible Defect' };
  const slopeMap = { 1: 'Upsloping', 2: 'Flat', 3: 'Downsloping' };
  const ecgMap = { 0: 'Normal', 1: 'ST-T Abnormality', 2: 'LV Hypertrophy' };

  const inputsList = isQuick
    ? [
        { label: 'Age', val: `${formData?.age ?? '—'} years` },
        { label: 'Biological Sex', val: formData?.sex == 1 ? 'Male' : 'Female' },
        { label: 'Blood Pressure (BP)', val: `${formData?.bp ?? formData?.trestbps ?? '—'} mm Hg` },
        { label: 'Heart Rate (Max HR)', val: `${formData?.max_hr ?? formData?.thalach ?? '—'} bpm` },
      ]
    : [
        { label: 'Age', val: `${formData?.age ?? '—'} years` },
        { label: 'Biological Sex', val: formData?.sex == 1 ? 'Male' : 'Female' },
        { label: 'Chest Pain Type', val: `${formData?.cp ?? '—'} (${cpMap[formData?.cp] || '—'})` },
        { label: 'Resting Blood Pressure', val: `${formData?.trestbps ?? '—'} mm Hg` },
        { label: 'Serum Cholesterol', val: `${formData?.chol ?? '—'} mg/dl` },
        { label: 'Fasting Blood Sugar > 120', val: formData?.fbs == 1 ? 'True (>120 mg/dl)' : 'False (<=120)' },
        { label: 'Resting ECG', val: `${formData?.restecg ?? '—'} (${ecgMap[formData?.restecg] || 'Normal'})` },
        { label: 'Max Heart Rate', val: `${formData?.thalach ?? '—'} bpm` },
        { label: 'Exercise-Induced Angina', val: formData?.exang == 1 ? 'Yes (Present)' : 'No (Absent)' },
        { label: 'ST Depression (Oldpeak)', val: `${Number(formData?.oldpeak || 0).toFixed(1)} mm` },
        { label: 'Slope of Peak ST', val: `${formData?.slope ?? '—'} (${slopeMap[formData?.slope] || '—'})` },
        { label: 'Major Vessels (Fluoroscopy)', val: `${formData?.ca ?? 0} colored` },
        { label: 'Thalassemia', val: `${formData?.thal ?? '—'} (${thalMap[formData?.thal] || '—'})` },
      ];

  const colWidth = contentWidth / 2 - 3;
  doc.setFontSize(8.5);

  inputsList.forEach((item, idx) => {
    const isCol2 = idx % 2 === 1;
    const xPos = isCol2 ? margin + colWidth + 6 : margin;
    const currentY = y + Math.floor(idx / 2) * 5.8;

    doc.setFillColor(idx % 4 < 2 ? 248 : 255, idx % 4 < 2 ? 250 : 255, idx % 4 < 2 ? 252 : 255);
    doc.rect(xPos, currentY - 3.8, colWidth, 5.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(item.label + ':', xPos + 2, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.val), xPos + colWidth - 2, currentY, { align: 'right' });
  });

  y += Math.ceil(inputsList.length / 2) * 5.8 + 6;

  // Model Information Section
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MODEL ARCHITECTURE & PIPELINE INFORMATION:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    isQuick
      ? 'Architecture: Dedicated StandardScaler + 4-Feature L2 Logistic Regression (Trained on 504,000 samples)'
      : 'Architecture: StandardScaler (Z-score) + L2-Regularized Logistic Regression  •  Features: 13 Clinical Inputs + 3 Interaction Terms',
    margin + 4,
    y + 10
  );

  y += 18;

  // Feature Contribution Section
  const contributing = lr.contributing_features || result.contributing_factors || [];
  if (contributing.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      isQuick ? 'MODEL PREDICTION EXPLANATION (4-FEATURE WEIGHT IMPACT)' : 'MODEL PREDICTION EXPLANATION (TOP CONTRIBUTING FACTORS)',
      margin,
      y
    );

    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    const topFactors = contributing.slice(0, 6);
    topFactors.forEach((factor, idx) => {
      const isRisk = factor.direction === 'increases_risk';
      const dirSymbol = isRisk ? '[+] Increases Score' : '[-] Decreases Score';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${factor.feature_name}`, margin + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(isRisk ? 185 : 4, isRisk ? 28 : 120, isRisk ? 28 : 87);
      doc.text(dirSymbol, margin + 55, y);

      doc.setTextColor(71, 85, 105);
      doc.text(
        `Impact: ${factor.contribution > 0 ? '+' : ''}${Number(factor.contribution).toFixed(4)}`,
        margin + 95,
        y
      );

      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      const expl = doc.splitTextToSize(factor.explanation || '', contentWidth - 135);
      doc.text(expl, margin + 130, y);

      y += 5.2;
    });
    y += 4;
  }

  // Mandatory Academic & Medical Disclaimer
  const disclaimerHeight = 24;
  const disclaimerY = pageHeight - margin - disclaimerHeight;

  doc.setFillColor(255, 251, 235); // Amber-50
  doc.setDrawColor(253, 230, 138); // Amber-200
  doc.roundedRect(margin, disclaimerY, contentWidth, disclaimerHeight, 1.5, 1.5, 'FD');

  doc.setTextColor(146, 64, 14); // Amber-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ACADEMIC AND EDUCATIONAL DEMONSTRATION NOTICE:', margin + 4, disclaimerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const disclaimerText = isQuick
    ? 'This report is generated for academic and educational demonstration purposes only by a statistical machine learning model (Quick 4-Feature Logistic Regression). It does NOT constitute a clinical diagnosis, medical opinion, prognosis, or therapeutic recommendation. Cardiovascular disease assessment requires comprehensive clinical evaluation by licensed medical professionals.'
    : 'This report is generated for academic and educational demonstration purposes only by a statistical machine learning model (Logistic Regression). It does NOT constitute a clinical diagnosis, medical opinion, prognosis, or therapeutic recommendation. Cardiovascular disease assessment requires comprehensive clinical evaluation by licensed medical professionals.';
  const wrapped = doc.splitTextToSize(disclaimerText, contentWidth - 8);
  doc.text(wrapped, margin + 4, disclaimerY + 10);

  // Save the PDF
  const filename = isQuick
    ? `Quick_Heart_Risk_Report_${Date.now()}.pdf`
    : `Heart_Disease_Risk_Assessment_${Date.now()}.pdf`;
  doc.save(filename);
}
