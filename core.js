// ---- Helper: convert yyyy-mm-dd → dd.mm.yyyy ----
function formatDate(input) {
  if (!input) return "";
  const parts = input.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return input;
}

document.addEventListener("DOMContentLoaded", async () => {
  // ---- Tab switching ----
  const tabs = document.querySelectorAll(".tab-btn");
  const forms = document.querySelectorAll(".patient-form");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      forms.forEach(f => f.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });

  // ---- Load districts from JSON ----
  try {
    const response = await fetch("districts.json");
    const data = await response.json();
    const districts = data.districts || [];

    document.querySelectorAll(".district-select").forEach(select => {
      districts.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        select.appendChild(opt);
      });
    });
  } catch (err) {
    console.error("Failed to load districts:", err);
  }
  
  document.querySelectorAll(".latin-preview-input").forEach(input => {
    let preview = document.createElement("div");
    preview.className = "preview";
    preview.innerHTML = 'Preview (Latin): <span class="preview-text"></span>';
    input.insertAdjacentElement("afterend", preview);
  
    const previewText = preview.querySelector(".preview-text");
  
    input.addEventListener("input", () => {
      const value = input.value || "";
      previewText.textContent = lotinKirill.cyrillicToLatin(value);
    });
  });
});

// ---- Load file as ArrayBuffer ----
async function loadFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load template");
  return await response.arrayBuffer();
}

// ---- Form submit ----
document.getElementById("docForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {};

  // Collect values
  for (let [key, value] of formData.entries()) {
    if (key === "date") {
      data[key] = formatDate(value);
    } else {
      data[key] = value || "";
    }
  }

  // Build addresses & transliterate
  for (let i = 1; i <= 5; i++) {
    // Convert Cyrillic → Latin for relevant fields
    data[`full_name_${i}`]  = data[`full_name_${i}`] ? lotinKirill.cyrillicToLatin(data[`full_name_${i}`]) : "";
    data[`id_number_${i}`]  = data[`id_number_${i}`] || "";
    data[`gender_${i}`]     = data[`gender_${i}`] || "";
    data[`date_of_birthday_${i}`] = data[`date_of_birthday_${i}`] || "";
    data[`job_${i}`]        = data[`job_${i}`] ? lotinKirill.cyrillicToLatin(data[`job_${i}`]) : "Ishsiz";
    data[`illness_${i}`]    = data[`illness_${i}`] ? lotinKirill.cyrillicToLatin(data[`illness_${i}`]) : "";

    // Build address with MFY/qishlog'i option
    let district = data[`address_district_${i}`] ? lotinKirill.cyrillicToLatin(data[`address_district_${i}`]) : "";
    
    // Check if "qishlog'i" checkbox is checked
    const useVillage = document.querySelector(`.use-village-checkbox[data-patient="${i}"]`)?.checked || false;
    let suffix = useVillage ? " qishlog‘i, " : " MFY, ";
    
    let mfy = data[`address_mfy_${i}`] ? lotinKirill.cyrillicToLatin(data[`address_mfy_${i}`]) + suffix : "";
    let street = data[`address_street_${i}`] ? lotinKirill.cyrillicToLatin(data[`address_street_${i}`]) + " ko‘chasi, " : "";
    let house = data[`address_house_${i}`] ? lotinKirill.cyrillicToLatin(data[`address_house_${i}`]) + "-uy" : "";

    data[`address_${i}`] = `${district}, ${mfy}${street}${house}`
      .replace(/,\s*,/g, ",")
      .replace(/,\s*$/, "");

    // Set conditional flag - show patient only if full_name exists
    data[`patient${i}`] = !!(data[`full_name_${i}`] && data[`full_name_${i}`].trim() !== "");
  }

  try {
    const content = await loadFile("template_{nurse_name}_{date}.docx");
    const zip = new PizZip(content);
    const doc = new docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData(data);
    doc.render();

    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    let nurse = data.nurse_name ? lotinKirill.cyrillicToLatin(data.nurse_name) : "Nurse";
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
