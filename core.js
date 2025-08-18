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
	  // create preview element if not already there
	  let preview = document.createElement("div");
	  preview.className = "preview";
	  preview.innerHTML = 'Preview (Latin): <span class="preview-text"></span>';
	  input.insertAdjacentElement("afterend", preview);
	
	  const previewText = preview.querySelector(".preview-text");
	
	  input.addEventListener("input", () => {
	    const value = input.value || "";
	    previewText.textContent = lotin_kirill.toLatin(value);
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

  // Collect values as-is
  for (let [key, value] of formData.entries()) {
	if (key === "date") {
	// only format the report date (from date picker)
		data[key] = formatDate(value);
	} else {
	// patients' birthdays are typed manually as dd.mm.yyyy
		data[key] = value || "";
	  }
	}


  // Ensure defaults & build addresses
  for (let i = 1; i <= 5; i++) {
  // Cyrillic → Latin conversion for patient fields
  data[`full_name_${i}`]  = data[`full_name_${i}`] ? lotin_kirill.toLatin(data[`full_name_${i}`]) : "";
  data[`id_number_${i}`]  = data[`id_number_${i}`] || "";
  data[`gender_${i}`]     = data[`gender_${i}`] || "";
  data[`date_of_birthday_${i}`] = data[`date_of_birthday_${i}`] || "";
  data[`job_${i}`]        = data[`job_${i}`] ? lotin_kirill.toLatin(data[`job_${i}`]) : "Ishsiz";
  data[`illness_${i}`]    = data[`illness_${i}`] ? lotin_kirill.toLatin(data[`illness_${i}`]) : "";

  // Address parts (also transliterated)
  let district = data[`address_district_${i}`] ? lotin_kirill.toLatin(data[`address_district_${i}`]) : "";
  let mfy      = data[`address_mfy_${i}`] ? lotin_kirill.toLatin(data[`address_mfy_${i}`]) + " MFY, " : "";
  let street   = data[`address_street_${i}`] ? lotin_kirill.toLatin(data[`address_street_${i}`]) + " ko‘chasi, " : "";
  let house    = data[`address_house_${i}`] ? lotin_kirill.toLatin(data[`address_house_${i}`]) + "-uy" : "";

  data[`address_${i}`] = `${district}, ${mfy}${street}${house}`
    .replace(/,\s*,/g, ",")
    .replace(/,\s*$/, "");
}

  try {
    const content = await loadFile("template_{nurse_name}_{date}.docx");
    const zip = new PizZip(content);

    // ✅ lowercase constructor
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

    let nurse = data.nurse_name ? lotin_kirill.toLatin(data.nurse_name) : "Nurse";
	let date  = data.date || "Date";


    nurse = nurse.replace(/\s+/g, "_");
    date = date.replace(/\//g, ".").replace(/-/g, ".");

    let filename = `OIV_${nurse}_${date}.docx`;
    saveAs(out, filename);

  } catch (error) {
    console.error("Error while generating document:", error);
    alert("Failed to generate DOCX. See console for details.");
  }
});

