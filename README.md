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
        sampleType        : String enum { // Sample Type: Select List
            withPackaging;
            withoutPackaging
        };
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
        PackagingMaterial : String enum { // Packaging Material: Select List
            Plastic;
            Metal;
            OtherMaterial
        };

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

8.	Enter in your terminal
   
```npm update --package-lock-only```

```mbt build```

```cf login```

```cf deploy mta_file```

10.	Copy the app router url and try out your backend service.
    
12.	Enter in the terminal ```cds -2 json .\srv\SampleJL-service.cds``` and copy the json into a new file.

13.	Create a new custom service entity in the Sales and Service Cloud V2 frontend, convert the CAP json file, download the final json definition and upload it in custom services
    
14.	Add UI’s to your custom service
    
15.	Assign it to your user via a business role
    
16.	Test!
