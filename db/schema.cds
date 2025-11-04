namespace sap.capire.customservice;

using {managed} from '@sap/cds/common';

entity Samples : managed {
    key ID                : UUID;
        sampleName        : String(255); // Sample Name: Text
        sampleType        : String enum { // Sample Type: Select List
            withPackaging;
            withoutPackaging
        };

        productUUID       : UUID;
        product           : Association to Products
                                on product.productID = productUUID; // Product: Relation (Part Number)
// not needed for custom services (obsolete)
        customerUUID      : UUID;

        Customer          : UUID;
        account           : Association to Account
                                on account.accountID = Customer; // just a simple UUID is needed because it is foreign key scenario

        employeeUUID      : UUID;
        employee          : Association to Employee
                                on employee.employeeID = employeeUUID; // Opportunity: Relation (Opportunity)

        opportunity       : Association to Opportunities; // Opportunity: Relation (Opportunity)
        serviceCase       : Association to ServiceCases; // Product: Relation (Part Number)

        numberOfSamples   : Integer; // Number of Samples: Number
        shipToAddress     : String(255); // Ship to Address: Address (structured type)

        @dataFormat: 'AMOUNT'
        costOfSample      : Composition of Amount; // Cost of Sample: Currency

        hazardous         : Boolean; // Hazardous: Boolean
        hazardousReason   : String(1000); // Hazardous Reason: Text-Long (1000 Chars)
        dueDate           : Date; // Due Date: Date
        overdueStatusIcon : String(255); // Overdue Status: String to hold emoticon
        status            : String enum { // Status: Select List
            Open;
            InProgress;
            Delivered;
            Returned;
            Overdue
        };

        // Only relevant if sampleType = withPackaging
        PackagingHeight   : Decimal(15, 2); // Packagin Height
        PackagingWidth    : Decimal(15, 2); // Packaging Width
        PackagingMaterial : String enum { // Packaging Material: Select List
            Plastic;
            Metal;
            OtherMaterial
        };

        // Composition: sub-entity Notes (one or many as needed)
        notes             : Composition of many Notes
                                on notes.sample = $self; // Composition of Notes

}

// New Notes sub-entity used as composition from Samples
entity Notes : managed {
    key notesID : UUID;
        note    : String(1000);
        sample  : Association to Samples; // association back to parent used by the ON-condition
}

entity Products {
    key productID : UUID;
        displayId : String;
        name      : String(255);
}

entity Opportunities {
    key opportunityID : UUID;
        name          : String(255);
}

@isCnsEntity: true
entity Account {
    key accountID : UUID;
        displayId : String;
        @description name      : String(255);
}

entity ServiceCases {
    key caseID : UUID;
        name   : String(255);
}

entity Employee {
    key employeeID : UUID;
        name       : String(255);
}

@isCnsEntity: true
entity Amount {
    key ID           : UUID;
        currencyCode : String;
        content      : Decimal(10, 2);
}
