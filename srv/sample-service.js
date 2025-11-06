const cds = require('@sap/cds');
const crypto = require("crypto");
const { SELECT } = cds;

module.exports = cds.service.impl(async function () {

const { Samples } = this.entities;

    // Before Read to expand any sub structure like amounts
    this.before('READ', Samples, (req) => {
        const sel = req.query && req.query.SELECT;
        if (!sel) return; // nothing to change for non-SELECT requests

        // ensure columns array exists and starts with all columns
        if (!sel.columns || sel.columns.length === 0) sel.columns = [{ ref: ['*'] }];

        const ensureNavExpand = (nav) => {
            const exists = sel.columns.some(col => {
                return col && col.ref && Array.isArray(col.ref) && col.ref[0] === nav;
            });
            if (!exists) sel.columns.push({ ref: [nav], expand: ['*'] });
        };

        ensureNavExpand('costOfSample');
        ensureNavExpand('account');
        ensureNavExpand('product');

    });

 // Get Product and Account details on the fly and add to response
    this.after('READ', 'Samples', async (Samples, req) => {
       console.log("After.Read for sample was started");


        // Skip if there are no samples
        if (!Samples || Samples.length === 0) {
            return Samples;
        }

        // Get Product details and add to response
        try {
            const productApi = await cds.connect.to("Product.Service");
            const requestList = [];

            // forming batch call
            Samples?.forEach((sa, index) => {
              if (!(sa.product && sa.product.productID)) return;
                console.log("Product ID: "+sa.product.productID);
                let productCnsEndPoint = `/sap/c4c/api/v1/product-service/products/${sa.product.productID}?$select=displayId,id,name`;
                requestList.push({
                    "id": 'productCns_' + index++,
                    "url": productCnsEndPoint,
                    "method": "GET"
                })
            });
            const productDataBatchResp = await productApi.send({
                method: "POST",
                path: `$batch`,
                headers: {
                    "Content-Type": "application/json",
                },
                data: {
                    "requests": requestList
                }
            });
            productDataBatchResp.responses.forEach((eachProdDtl, index) => {
                if (eachProdDtl?.body?.value) {
                    Samples[index]['product'] = {
                        id: eachProdDtl.body.value.id,
                        name: eachProdDtl.body.value.name,
                        displayId: eachProdDtl.body.value.displayId

                    };
                    
                }
            })


            // Get Account details and add to response
            const accountApi = await cds.connect.to("Account.Service");
            const requestList2 = [];

            // forming batch call
            Samples?.forEach((sa, index) => {
              if (!(sa.account && sa.account.accountID)) return;
                let accountCnsEndPoint = `/sap/c4c/api/v1/account-service/accounts/${sa.account.accountID}?$select=displayId,id,formattedName`;
                requestList2.push({
                    "id": 'accountCns_' + index++,
                    "url": accountCnsEndPoint,
                    "method": "GET"
                })
            });
            const accountDataBatchResp = await accountApi.send({
                method: "POST",
                path: `$batch`,
                headers: {
                    "Content-Type": "application/json",
                },
                data: {
                    "requests": requestList2
                }
            });
            accountDataBatchResp.responses.forEach((eachAccDtl, index) => {
                if (eachAccDtl?.body?.value) {
                    Samples[index]['account'] = {
                        id: eachAccDtl.body.value.id,
                        name: eachAccDtl.body.value.formattedName,
                        displayId: eachAccDtl.body.value.displayId
                    };
                    console.log("Account response reached. Some values: "+eachAccDtl.body.value.displayId+" "+eachAccDtl.body.value.formattedName);
                }
            })

            return Samples;
        } catch (err) {
            return req.reject("Account and Product are mandatory. "+err);
        }    
   })

/*
  // After create: send REST call to create a new timeline entry
  this.after('CREATE', Samples, async (sample, req) => {
    console.log("After create logic started");

    if (req.target !== Samples) return sample;

    try {
      const timelineApi = await cds.connect.to("Timeline.Service");

      // generate event id and current time
      const eventId = crypto.randomUUID();
      const eventTime = new Date().toISOString();

      // determine account id from sample (try several possible fields)
      const accountId = sample.Customer || sample.customerUUID || (sample.account && (sample.account.accountID || sample.account.id));

      const payload = {
        id: eventId,
        subject: sample.ID,                                  // subject equals the sample ID
        type: "customer.ssc.sampleservice.event.SampleCreate",
        specversion: "0.2",
        source: "614cd785fe86ec5c905b4a00",
        time: eventTime,
        datacontenttype: "application/json",
        data: {
          currentImage: {
            ID: sample.ID,
            name: sample.sampleName,
            status: sample.status,
            account: {
              id: accountId
            }
          }
        }
      };

      const resp = await timelineApi.send({
        method: "POST",
        path: "/sap/c4c/api/v1/inbound-data-connector-service/events",
        headers: { "Content-Type": "application/json" },
        data: payload
      });

      console.log(`[Timeline] posted event ${eventId} for sample ${sample.ID} - status=${resp && resp.status ? resp.status : 'unknown'}`);
    } catch (err) {
      console.error('[Timeline] failed to post event for sample', sample && sample.ID, err && (err.stack || err.message || err));
      // do not reject the original create - just log the error
    }

    return sample;
    
  });

*/

/*

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
      if (due < today && !d.sampleName.endsWith(' 🔴')) {
        d.sampleName = `${d.sampleName} 🔴`;
        if (d.status === 'Open') {
          d.status = 'Overdue';
        }
      } else if (due >= today && d.sampleName.endsWith(' 🔴')) {
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
      if (due2 < today2 && !d.sampleName.endsWith(' 🔴')) {
        d.sampleName = `${d.sampleName} 🔴`;
        if (d.status === 'Open') {
          d.status = 'Overdue';
        }
      } else if (due2 >= today2 && d.sampleName.endsWith(' 🔴')) {
        d.sampleName = d.sampleName.slice(0, -2);
      }
    }

  });


  */
});