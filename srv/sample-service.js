const cds = require('@sap/cds');

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
  });

  // Validate before UPDATE (only for root Samples entity)
  this.before('UPDATE', Samples, (req) => {
    if (req.target !== Samples) return;

    const d = req.data || {};

    if ('numberOfSamples' in d && d.numberOfSamples != null && d.numberOfSamples <= 0) {
      return req.reject(400, 'Number of Samples must be greater than zero');
    }
    if ('hazardous' in d && d.hazardous === true && ('hazardousReason' in d) && (!d.hazardousReason || !d.hazardousReason.toString().trim())) {
      return req.reject(400, 'Hazardous Reason is required when hazardous is true');
    }
  });

});