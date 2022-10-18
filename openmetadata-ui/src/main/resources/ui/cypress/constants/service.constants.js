import { uuid } from './constants';
const uniqueID = uuid();

export const REDSHIFT = {
  serviceType: 'Redshift',
  serviceName: `Redshift-ct-test-${uniqueID}`,
  tableName: 'boolean_test',
  DBTTable: 'customers',
  description: `This is Redshift-ct-test-${uniqueID} description`,
};
