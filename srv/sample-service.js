const cds = require('@sap/cds');
const crypto = require("crypto");
const { SELECT } = cds;

module.exports = cds.service.impl(async function () {


      // Old code to auto expand costOfSample
    /*         
        this.before('READ', 'Samples', (req) => {
            if (!req.query.SELECT.columns || req.query.SELECT.columns.length === 0) {
                req.query.SELECT.columns = [];
                req.query.SELECT.columns.push('*');
                req.query.SELECT.columns.push({ ref: ['costOfSample'], expand: ['*'] });
                req.query.SELECT.columns.push({ ref: ['product'], expand: ['*'] });
                req.query.SELECT.columns.push({ ref: ['account'], expand: ['*'] });
            }
        })
    */

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


    // Get Product details and add to response
    this.after('READ', 'Products', async (Products, req) => {
       console.log("After.Read for product was started");

        try {
            const productApi = await cds.connect.to("Product.Service");
            const requestList = [];

            // forming batch call
            Products.forEach((pd, index) => {
              console.log("Product ID: "+pd.productID);
                let productCnsEndPoint = `/sap/c4c/api/v1/product-service/products/${pd.productID}?$select=displayId,id,name`;
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
                    Products[index]['product'] = {
                        id: eachProdDtl.body.value.id,
                        name: eachProdDtl.body.value.name,
                        displayId: eachProdDtl.body.value.displayId

                    };
                    
                }
            })
            return Products;
        } catch (err) {
            return req.reject(err);
        }
    })

    // Get Account details and add to response
    this.after('READ', 'Account', async (Account, req) => {
        try {
            const accountApi = await cds.connect.to("Account.Service");
            const requestList = [];

            // forming batch call
            Account.forEach((ac, index) => {
                let accountCnsEndPoint = `/sap/c4c/api/v1/account-service/accounts/${ac.accountID}?$select=displayId,id,formattedName`;
                requestList.push({
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
                    "requests": requestList
                }
            });
            accountDataBatchResp.responses.forEach((eachAccDtl, index) => {
                if (eachAccDtl?.body?.value) {
                    Account[index]['account'] = {
                        id: eachAccDtl.body.value.id,
                        name: eachAccDtl.body.value.formattedName,
                        displayId: eachAccDtl.body.value.displayId
                    };
                    console.log("Account response reached. Some values: "+eachAccDtl.body.value.displayId+" "+eachAccDtl.body.value.firstLineName);
                }
            })
            return Account;
        } catch (err) {
            return req.reject(err);
        }
    })



  /*


  const { Samples } = this.entities;


// helper to POST the exact JSON payload to the external REST endpoint
  const postInboundEvent = (body) => {
    const data = JSON.stringify(body);
    const user = process.env.INBOUND_USER || 'INBOUNDSAMPLE';
    const pass = process.env.INBOUND_PASS || 'WelCome123!$%WeLcoMe1!123$%&/t';
    const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

    const options = {
      hostname: 'my1000210.de1.demo.crm.cloud.sap',
      path: '/sap/c4c/api/v1/inbound-data-connector-service/events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': auth
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let resp = '';
        res.on('data', (chunk) => resp += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve({ status: res.statusCode, body: resp });
          return reject(new Error(`HTTP ${res.statusCode}: ${resp}`));
        });
      });

      req.on('error', (err) => reject(err));
      req.write(data);
      req.end();
    });
  };

// After create: send REST call (handled safely to avoid breaking the CREATE)
  this.after('CREATE', Samples, async (sample, req) => {
    if (req.target !== Samples) return sample;

    // payload must look exactly like provided JSON
    const payload = {
        "id": uuidv4(),
        "subject": "e8740ebc-0d88-43af-894d-79ecd41e5f57",
        "type": "customer.ssc.sampleservice.event.SampleCreate",
        "specversion": "0.2",
        "source": "614cd785fe86ec5c905b4a01",
        "time": "2025-01-23T01:10:00.180Z",
        "datacontenttype": "application/json",
        "data": {
            "currentImage": {
                "id": "e8740ebc-0d88-43af-894d-79ecd41e5f57",
                "sampleName": "Full Sample Event",
                "status": "OPEN",
                "account": {
                    "customerUUID": "11ed76db-06ae-3eee-afdb-81a1db010a00"
                }
            }
        }
    };

    try {
      await postInboundEvent(payload);
      // optionally log success
      console.log('Inbound event posted successfully');
    } catch (err) {
      // do not throw — log the error so CREATE is not turned into a 500
      console.error('Failed to post inbound event:', err && err.message ? err.message : err);
    }

    return sample;
  });



  
  // Enhance READ to always expand certain navigation properties
    this.before('READ', Samples, (req) => {
        const sel = req.query && req.query.SELECT;
        if (!sel) return;

        // ensure columns array exists
        if (!sel.columns || sel.columns.length === 0) sel.columns = [{ ref: ['*'] }];

        const ensureNavExpand = (nav) => {
            const exists = sel.columns.some(col => {
                return col && col.ref && Array.isArray(col.ref) && col.ref[0] === nav;
            });
            if (!exists) sel.columns.push({ ref: [nav], expand: ['*'] });
        };

        ensureNavExpand('costOfSample');
        ensureNavExpand('account');
    })

    this.after('READ', Samples, (Samples, req) => {
        const rows = Array.isArray(Samples) ? Samples : [Samples];

        rows.forEach((po) => {
            // remove unnecessary fields from Response
            if (po?.costOfSample?.ID) delete po.costOfSample.ID;
            if (po?.customerUUID) delete po.customerUUID;
        });

        return Array.isArray(Samples) ? rows : rows[0];
    })

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