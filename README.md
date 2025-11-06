# Custom Services - Step by Step

This is a step by step instruction how to create an already more complete custom services including value selectors and a custom UI.

📺**Video Tutorial**: You can either follow the steps below or watch the video (10 minutes) where I show each and every step needed in full detail.

-> [Video Tutorial - Custom Services](https://sapvideo.cfapps.eu10-004.hana.ondemand.com/?entry_id=1_5r2suzns)

The above video shows very nice all the detailed steps including both the CAP and also the Sales and Service V2 custom services part.

If you want to see less CAP Development and more on how it looks later for the end-user I can recommend you to watch this more high level [overview video](https://sapvideo.cfapps.eu10-004.hana.ondemand.com/?entry_id=1_zptgr1j5).

*PS: If you are also interessted in some very basics about extensibility you can also check out my [main page](https://github.com/jens-limbach/SSv2-extensibility-workshop/tree/main) with a guide on mashups and custom code in a cloud function.*

**Pre-requisites:**

- You have a BTP sub-account and access to Cloud Foundry (you can use a free <a href="https://account.hanatrial.ondemand.com/" target="_blank">BTP Trial</a>)
- You have setup a Hana Cloud on your BTP Sub-Account (take a look [here](https://github.com/jens-limbach/SSv2-extensibility-workshop/blob/main/hana-setup.md) for the basic steps needed)
- You have setup VSCode and done the initial setup for CAP
- You have enabled the Custom Services feature for creating new entities in your SAP Sales and Service Cloud V2
- You are a little bit familiar with coding or curious enough to get into it :)

**Step by Step Guide:**

Important: If you try this out with several colleagues on the same BTP, please make sure you replace the suffix "JL" with your initials to make it unique.

1.	Open VSCode and the terminal
2.	Enter in the terminal ```cds init SampleJL```
3.	Enter in the terminal  ```code SampleJL``` (on windows at least this opens the project in visual code :P)
4.	Create ```schema.cds``` file with your entity in the db folder -> Snippet 1

Snippet 1:
```
namespace sap.capire.customservice;

using {managed} from '@sap/cds/common';

entity Samples : managed {
    key ID                : UUID;
        @description
        sampleName        : String(255); // Sample Name: Text
        sampleType        : SampleCodeType;
        numberOfSamples   : Integer; // Number of Samples: Number
        shipToAddress     : String(255); // Ship to Address: Address (structured type)
        @dataFormat: 'AMOUNT'
        costOfSample      : Composition of Amount; // Cost of Sample: Currency
        hazardous         : Boolean; // Hazardous: Boolean
        hazardousReason   : String(1000); // Hazardous Reason: Text-Long (1000 Chars)
        @dataFormat: 'DATE'
        dueDate           : Date; // Due Date: Date
        overdueStatusIcon : String(255); // Overdue Status: String to hold emoticon
        status            : StatusCodeType default 'Open'; // Status: Select List
        // Only relevant if sampleType = withPackaging
        PackagingHeight   : Decimal(15, 2); // Packagin Height
        PackagingWidth    : Decimal(15, 2); // Packaging Width
        PackagingMaterial : PackagingCodeType;

        // Associations to other entities
        productUUID       : UUID;
        product           : Composition of Products
                                on product.ID = productUUID; // Product: Relation (Part Number)

        accountUUID      : UUID;
        account           : Composition of Account
                                on account.ID = accountUUID; // just a simple UUID is needed because it is foreign key scenario

        employeeUUID      : UUID;
        employee          : Association to Employee
                                on employee.employeeID = employeeUUID; // Employee: Relation (Employee)

        opportunityUUID   : UUID;
        opportunity       : Association to Opportunities // Opportunity: Relation (Opportunity)
                                on opportunity.opportunityID = opportunityUUID;

        serviceCaseUUID   : UUID;
        serviceCase       : Association to ServiceCases // Service Case: Relation (Service Case)
                                on serviceCase.caseID = serviceCaseUUID;

        // Composition: sub-entity Notes (one or many as needed)
        notes             : Composition of many Notes
                                on notes.sample = $self; // Composition of Notes

}

// Structured data type for Amount
@isCnsEntity: true
entity Amount {
    key ID           : UUID;
        currencyCode : String;
        content      : Decimal(10, 2);
}

// Enum types

type StatusCodeType : String @assert.range enum {
    ACTIVE    = 'Open';
    INPROGRESS  = 'InProgress';
    DELIVERED    = 'Delivered';
    RETURNED  = 'Returned';
    OVERDUE    = 'Overdue';
}

type PackagingCodeType : String @assert.range enum {
    PLASTIC    = 'Plastic';
    METAL  = 'Metal';
    OTHERMATERIAL    = 'OtherMaterial';
}

type SampleCodeType : String @assert.range enum {
    WITHPACKAGING    = 'withPackaging';
    WITHOUTPACKAGING  = 'withoutPackaging';
}
            
            

// New Notes sub-entity used as composition from Samples
entity Notes : managed {
    key notesID : UUID;
        note    : String(1000);
        sample  : Association to Samples; // association back to parent used by the ON-condition
}

// Associated CRM entities

@isCnsEntity: true
entity Products {
    key ID        : UUID;
        productID : UUID;
        displayId : String;
        @description name      : String(255);
}

@isCnsEntity: true
entity Account {
    key ID : UUID;
        accountID : UUID;
        displayId : String;
        @description name      : String(255);
}

@isCnsEntity: true
entity Opportunities {
    key opportunityID : UUID;
}

@isCnsEntity: true
entity ServiceCases {
    key caseID : UUID;
}

@isCnsEntity: true
entity Employee {
    key employeeID : UUID;
}
```

5.	Create ```sample-service.cds``` file in the srv folder with your service definition -> Snippet 2

Snippet 2:
```
using {sap.capire.customservice as sampleschema} from '../db/schema';

service SampleService @(path: '/sample-service') {

    // Projections so that we have those endpoints ready for our frontend application
    @odata.draft.bypass
    entity Samples as projection on sampleschema.Samples excluding { createdAt, createdBy, modifiedBy };
    entity Notes        as projection on sampleschema.Notes excluding { createdAt, createdBy, modifiedBy };

    // Event for the Timeline Entry
    event customer.ssc.sampleservice.event.SampleCreate {};
}
```

6.	Enter in the terminal
   
```cds add hana```

```cds add xsuaa```

```cds add mta```

```cds add approuter```

9.	Adapt some files manually…

-> Adjust the ```package.json``` (overwrite the cds section by changing auth to mocked and adding the hana db) -> Snippet 3

<img src="https://github.com/jens-limbach/SSv2-extensibility-workshop/tree/2bafe55a3a0705af6d20373558da1dce293f782a/images/package-json.png">
 
Snippet 3:
```
"cds": {
    "requires": {
      "[production]": {
      "db": "hana",
      "auth": "mocked"
      },
      "auth": "mocked"
    }
  }
```

-> Adjust the ```app/router/xs-app.json``` by adding CORS exceptions (for your tenant) and adjust authMethod=none -> Snippet 4 and 5

<img src="https://github.com/jens-limbach/SSv2-extensibility-workshop/tree/2bafe55a3a0705af6d20373558da1dce293f782a/images/xs-app-json.png">
 
Snippet 4:
```
  "authenticationMethod": "none",
```

Snippet 5:

```
,
  "cors": [
    {
      "uriPattern": "(.*)",
      "allowedMethods": [
        "GET",
        "POST",
        "OPTIONS",
        "PATCH",
        "PUT",
        "DELETE"
      ],
      "allowedOrigin": [
        {
          "host": "localhost",
          "protocol": "http",
          "port": 5000
        },
        {
          "host": "localhost",
          "protocol": "http",
          "port": 4100
        },
        {
          "host": "localhost",
          "protocol": "http",
          "port": 4200
        },
        {
          "host": "ns-staging.cxm-salescloud.com",
          "protocol": "https"
        },
        {
          "host": "YOURTENANT.de1.demo.crm.cloud.sap",
          "protocol": "https"
        }
      ],
      "allowedHeaders": [
        "Accept",
        "Authorization",
        "Content-Type",
        "Access-Control-Allow-Credentials",
        "sap-c4c-rawagent",
        "X-Csrf-Token",
        "If-Match"
      ],
      "exposeHeaders": [
        "Etag",
        "X-Csrf-Token"
      ],
      "allowedCredentials": true
    }
  ]
```

-> Adapt the ```mta.yaml``` by changing the generated hana db name according to your own DB name (3 places in i.e. to “name: customservice-basic-db”) 

<img src="https://github.com/jens-limbach/SSv2-extensibility-workshop/tree/2bafe55a3a0705af6d20373558da1dce293f782a/images/mta-yaml.png">

-> In case your BTP subaccount has spaces in it’s name: adjust the ```xsappname: SampleJL``` in your ```mta.yaml``` by removing the generated placeholders for subaccount and space.

-> Optional hint: Add 128M memory to all your services in ```mta.yaml``` to save some dev space

7. Create a ```sample-service.js``` file and add the following logic to it. This logic ensures the response is well formatted for our purpose and also includes some commented logic that we will enable in a later step.

Snippet:
```
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
      const accountId = sample.Customer || sample.accountUUID || (sample.account && (sample.account.accountID || sample.account.id));

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
```

8. Add to your ```package.json``` the below directly into the cds production section. We need to add some credentials. You need to replace your tenant and credentials in the below code. Normally you would use BTP destinations here but this way we "save" a step.

After exactly the last curly bracket here:
```
  "cds": {
    "requires": {
      "[production]": {
        "db": "hana",
        "auth": "mocked"
      }
```
You must add that here and overwrite all the curly brackets at the end:
```
,
      "auth": "mocked",
      "Account.Service": {
        "kind": "rest",
        "[production]": {
          "credentials": {
            "url": "https://YOURTENANT.de1.demo.crm.cloud.sap",
            "username": "Dev",
            "password": "Welcome1!"
          }
        },
        "[development]": {
          "credentials": {
            "url": "https://YOURTENANT.de1.demo.crm.cloud.sap",
            "username": "Dev",
            "password": "Welcome1!"
          }
        }
      },
      "Product.Service": {
        "kind": "rest",
        "[production]": {
          "credentials": {
            "url": "https://YOURTENANT.de1.demo.crm.cloud.sap",
            "username": "Dev",
            "password": "Welcome1!"
          }
        },
        "[development]": {
          "credentials": {
            "url": "https://YOURTENANT.de1.demo.crm.cloud.sap",
            "username": "Dev",
            "password": "Welcome1!"
          }
        }
      },
      "Timeline.Service": {
        "kind": "rest",
        "[production]": {
          "credentials": {
            "url": "https://YOURTENANT.de1.demo.crm.cloud.sap",
            "username": "INBOUNDSAMPLE",
            "password": "WelCome123!$%WeLcoMe1!123$%&/t"
          }
        },
        "[development]": {
          "credentials": {
            "url": "https://YOURTENANT.de1.demo.crm.cloud.sap",
            "username": "INBOUNDSAMPLE",
            "password": "WelCome123!$%WeLcoMe1!123$%&/t"
          }
        }
      }
    }
  }
}
```

8.	Enter in your terminal

```npm install @sap-cloud-sdk/http-client @sap-cloud-sdk/resilience -save```

```npm update --package-lock-only```

```mbt build```

```cf login```

```cf deploy mta_file```

10.	Copy the app router url and try out your backend service.
    
12.	Enter in the terminal ```cds -2 json .\srv\Sample-service.cds > BackendService.json``` and copy the json into a new file.

13.	Create a new custom service entity in the Sales and Service Cloud V2 frontend, convert the CAP json file, download the final json definition 

13. Edit the downloaded metadata file and make the following adjustments:
-   Add a lable ```"label": "Samples",```
-   Add a unique object type code ```"objectTypeCode": "CUS1329",```
-   Remove the data formats from the ```"dataType": "BOOLEAN",```
-   Add in the notes sections the additional itemDataType
```
"dataType": "ARRAY",
"itemDataType": "OBJECT",
```
    
-   Check if all the enum values are generated correctly
-   Add a notes entity and api
-   Add a timeline event

14. upload the adjusted metadata file in custom services
    
14.	Add UI’s to your custom service
    
15.	Assign it to your user via a business role
    
16.	Test!
