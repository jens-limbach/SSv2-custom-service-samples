using {sap.capire.customservice as sampleschema} from '../db/schema';

service SampleService @(path: '/sample-service') {

    @odata.draft.bypass
    entity Samples as projection on sampleschema.Samples excluding { createdAt, createdBy, modifiedBy };


    entity Amount       as projection on sampleschema.Amount;
    entity Notes        as projection on sampleschema.Notes excluding { createdAt, createdBy, modifiedBy };
    entity Account     as projection on sampleschema.Account;

    event customer.ssc.sampleservice.event.SampleCreate {};
}