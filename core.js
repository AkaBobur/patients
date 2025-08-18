// Helper: convert yyyy-mm-dd → dd.mm.yyyy
function formatDate(input) {
  if (!input) return "";
  const parts = input.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return input;
}

// Helper: load file as ArrayBuffer
async function loadFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load template");
  return await response.arrayBuffer();
}

document.getElementById("docForm").addEventListener("submit", async function(e) {
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

  try {
    // Load DOCX template
    // Load template
    const content = await loadFile("template_fixed_gender.docx");
    const zip = new PizZip(content);   // ✅ should now work
    const doc = new window.docxtemplater(zip);
    doc.setData(data);

    doc.render();

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

  } catch (error) {
    console.error("Error while generating document:", error);
    alert("Failed to generate DOCX. See console for details.");
  }
});

