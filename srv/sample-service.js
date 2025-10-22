const cds = require('@sap/cds');
const { SELECT } = cds;

module.exports = cds.service.impl(async function () {
  const { Samples } = this.entities;

  // Validate before CREATE (only for root Samples entity)
  this.before('CREATE', Samples, (req) => {
    // ensure this runs only for the Samples root entity
    if (req.target !== Samples) return;

    const d = req.data || {};

    if (!d.sampleName || !d.sampleName.toString().trim()) {
      return req.reject(400, 'Sample Name is required');
    }
    if (d.numberOfSamples != null && d.numberOfSamples <= 0) {
      return req.reject(400, 'Number of Samples must be greater than zero');
    }
    if (d.hazardous === true && (!d.hazardousReason || !d.hazardousReason.toString().trim())) {
      return req.reject(400, 'Hazardous Reason is required when hazardous is true');
    }

    // Validate: "Returned" status only allowed for sampleType === 'withPackaging'
    if (d.status === 'Returned' && d.sampleType !== 'withPackaging') {
      return req.reject(400, 'Status "Returned" is only allowed for samples with sampleType "withPackaging"');
    }

    // Append "X" to sampleName if dueDate is later than today, otherwise remove trailing "X"
    if (d.dueDate && d.sampleName) {
      const due = new Date(d.dueDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      due.setHours(0,0,0,0);
      if (due > today && !d.sampleName.endsWith(' 🔴')) {
        d.sampleName = `${d.sampleName} 🔴`;
        if (d.status === 'Open') {
          d.status = 'Overdue';
        }
      } else if (due <= today && d.sampleName.endsWith(' 🔴')) {
        d.sampleName = d.sampleName.slice(0, -2);
      }
    }

    });

  // Validate before UPDATE (only for root Samples entity)
  this.before('UPDATE', Samples, async (req) => {
    if (req.target !== Samples) return;

    const d = req.data || {};

    if ('numberOfSamples' in d && d.numberOfSamples != null && d.numberOfSamples <= 0) {
      return req.reject(400, 'Number of Samples must be greater than zero');
    }
    if ('hazardous' in d && d.hazardous === true && ('hazardousReason' in d) && (!d.hazardousReason || !d.hazardousReason.toString().trim())) {
      return req.reject(400, 'Hazardous Reason is required when hazardous is true');
    }

    // Validate: "Returned" status only allowed for sampleType === 'withPackaging'
    if (d.status === 'Returned') {
      // determine sampleType: prefer incoming payload, otherwise read existing entity
      let sampleType = d.sampleType;
      if (!sampleType) {
        // try to extract key id from request
        let id = (d.ID) ? d.ID : (req.params && req.params[0] && (req.params[0].ID || Object.values(req.params[0])[0]));
        if (id) {
          const existing = await SELECT.one.from(Samples).where({ ID: id });
          if (existing) sampleType = existing.sampleType;
        }
      }
      if (sampleType !== 'withPackaging') {
        return req.reject(400, 'Status "Returned" is only allowed for samples with sampleType "withPackaging"');
      }
    }

    // Append "X" to sampleName if dueDate is provided and later than today.
    // If dueDate is not later than today remove trailing "X".
    // (Only modifies sampleName when sampleName is part of the request.)
    if (d.dueDate && d.sampleName) {
      const due2 = new Date(d.dueDate);
      const today2 = new Date();
      today2.setHours(0,0,0,0);
      due2.setHours(0,0,0,0);
      if (due2 > today2 && !d.sampleName.endsWith(' 🔴')) {
        d.sampleName = `${d.sampleName} 🔴`;
        if (d.status === 'Open') {
          d.status = 'Overdue';
        }
      } else if (due2 <= today2 && d.sampleName.endsWith(' 🔴')) {
        d.sampleName = d.sampleName.slice(0, -2);
      }
    }

  });

});