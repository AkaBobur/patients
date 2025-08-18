// Load file helper
async function loadFile(url, callback) {
  PizZipUtils.getBinaryContent(url, callback);
}

// Helper: convert yyyy-mm-dd → dd.mm.yyyy
function formatDate(input) {
  if (!input) return "";
  const parts = input.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return input;
}

document.getElementById("docForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {};

  // Fill values, format dates
  for (let [key, value] of formData.entries()) {
    if (key === "date" || key.startsWith("date_of_birthday_")) {
      data[key] = formatDate(value);
    } else {
      data[key] = value || "";
    }
  }

  // Ensure all 5 patient placeholders exist
  for (let i = 1; i <= 5; i++) {
    data[`full_name_${i}`] = data[`full_name_${i}`] || "";
    data[`id_number_${i}`] = data[`id_number_${i}`] || "";
    data[`gender_${i}`] = data[`gender_${i}`] || "";
    data[`date_of_birthday_${i}`] = data[`date_of_birthday_${i}`] || "";
    data[`address_${i}`] = data[`address_${i}`] || "";
    data[`job_${i}`] = data[`job_${i}`] || "";
    data[`illness_${i}`] = data[`illness_${i}`] || "";
  }

  // Load template
  loadFile("template_{nurse_name}_{date}.docx", function(error, content) {
    if (error) { 
      alert("Template load error: " + error); 
      throw error; 
    }

    const zip = new PizZip(content);
    const doc = new window.docxtemplater().loadZip(zip);
    doc.setData(data);

    try {
      doc.render();
    } catch (error) {
      console.error("Template rendering error:", error);
      alert("Error while rendering document. Check console.");
      throw error;
    }

    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    // Dynamic filename
    let nurse = data.nurse_name || "Nurse";
    let date = data.date || "Date";

    nurse = nurse.replace(/\s+/g, "_");
    date = date.replace(/\//g, ".").replace(/-/g, ".");

    let filename = `OIV_${nurse}_${date}.docx`;
    saveAs(out, filename);
  });
});
