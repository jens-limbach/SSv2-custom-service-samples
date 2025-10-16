using {sap.capire.customservice as sampleschema} from '../db/schema';

service SampleService @(path: '/sample-service') {

    @odata.draft.bypass
    entity Samples as projection on sampleschema.Samples;
}