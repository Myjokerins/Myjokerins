/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { deleteCreatedService, editOwnerforCreatedService, goToAddNewServicePage, interceptURL, login, testServiceCreationAndIngestion, updateDescriptionForIngestedTables, verifyResponseStatusCode, visitEntityDetailsPage } from '../../common/common';
import { DBT, HTTP_CONFIG_SOURCE, LOGIN, SERVICE_TYPE } from '../../constants/constants';
import { REDSHIFT } from '../../constants/service.constants';

describe('RedShift Ingestion', () => {
  beforeEach(() => {
    login(LOGIN.username, LOGIN.password);
    cy.goToHomePage();
  });
  it('add and ingest data', () => {
    goToAddNewServicePage(SERVICE_TYPE.Database);
    const connectionInput = () => {
      cy.get('#root_username').type(Cypress.env('redshiftUsername'));
      cy.get('#root_password')
        .scrollIntoView()
        .type(Cypress.env('redshiftPassword'));
      cy.get('#root_hostPort')
        .scrollIntoView()
        .type(Cypress.env('redshiftHost'));
      cy.get('#root_database')
        .scrollIntoView()
        .type(Cypress.env('redshiftDatabase'));
    };

    const addIngestionInput = () => {
      // no schema or database filters
      cy.get('[data-testid="schema-filter-pattern-checkbox"]').check();
      cy.get('[data-testid="filter-pattern-includes-schema"]')
        .should('be.visible')
        .type('dbt_jaffle');
      cy.get('[data-testid="toggle-button-include-views"]')
        .should('be.visible')
        .click();
    };

    const configureDBT = () => {
      cy.contains('Configure DBT Model').should('be.visible');
      cy.get('[data-testid="dbt-source"]')
        .should('be.visible')
        .select('HTTP Config Source');
      cy.get('[data-testid="catalog-url"]')
        .scrollIntoView()
        .should('be.visible')
        .type(HTTP_CONFIG_SOURCE.DBT_CATALOG_HTTP_PATH);
      cy.get('[data-testid="manifest-url"]')
        .scrollIntoView()
        .should('be.visible')
        .type(HTTP_CONFIG_SOURCE.DBT_MANIFEST_HTTP_PATH);
      cy.get('[data-testid="run-result-file"]')
        .scrollIntoView()
        .should('be.visible')
        .type(HTTP_CONFIG_SOURCE.DBT_RUN_RESTLTS_FILE_PATH);
    };

    testServiceCreationAndIngestion(
      REDSHIFT.serviceType,
      connectionInput,
      addIngestionInput,
      REDSHIFT.serviceName,
      'database',
      true,
      configureDBT
    );
  });

  it('Validate DBT is ingested properly', () => {
    //Verify DBT tags
    interceptURL('GET', '/api/v1/tags?fields=usageCount', 'getTagList');
    cy.get('[data-testid="appbar-item-tags"]')
      .should('exist')
      .should('be.visible')
      .click();
    verifyResponseStatusCode('@getTagList', 200);
    //Verify DBT tag category is added
    cy.get('[data-testid="tag-name"]')
      .should('be.visible')
      .should('contain', DBT.tagCategory);

    cy.get('.ant-table-row')
      .should('be.visible')
      .should('contain', DBT.tagName);

    //Verify DBT in table entity
    visitEntityDetailsPage(REDSHIFT.DBTTable, REDSHIFT.serviceName, 'tables');

    //Verify tags
    cy.get('[data-testid="entity-tags"]')
      .should('exist')
      .should('be.visible')
      .should('contain', `${DBT.tagCategory}.${DBT.tagName}`);
    //Verify DBT tab is present
    cy.get('[data-testid="DBT"]').should('exist').should('be.visible');
    cy.get('[data-testid="DBT"]').click();
    //Verify query is present in the DBT tab
    cy.get('.CodeMirror').should('be.visible').should('contain', DBT.dbtQuery);

    cy.get('[data-testid="Lineage"]').should('be.visible').click();

    cy.get('[data-testid="lineage-entity"]').should(
      'contain',
      DBT.dbtLineageNode
    );

    //Verify Data Quality
    cy.get('[data-testid="Profiler & Data Quality"]')
      .should('be.visible')
      .click();

    cy.get('[data-testid="profiler-switch"]').should('be.visible');
    cy.get('[data-testid="profiler-switch"]').contains('Data Quality').click();

    cy.get(`[data-testid=${DBT.dataQualityTest1}]`)
      .should('exist')
      .should('be.visible')
      .should('contain', DBT.dataQualityTest1);
    cy.get(`[data-testid=${DBT.dataQualityTest2}]`)
      .should('exist')
      .should('be.visible')
      .should('contain', DBT.dataQualityTest2);
  });

  it('Update table description and verify', () => {
    updateDescriptionForIngestedTables(
      REDSHIFT.serviceName,
      REDSHIFT.tableName,
      REDSHIFT.description,
      SERVICE_TYPE.Database,
      'tables'
    );
  });

  it('Edit and validate owner', () => {
    editOwnerforCreatedService(SERVICE_TYPE.Database, REDSHIFT.serviceName);
  });

  it('delete created service', () => {
    deleteCreatedService(SERVICE_TYPE.Database, REDSHIFT.serviceName);
  });
});
