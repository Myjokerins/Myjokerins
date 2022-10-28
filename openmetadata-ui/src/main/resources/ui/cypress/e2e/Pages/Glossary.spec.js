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

import { descriptionBox, interceptURL, login, verifyResponseStatusCode, visitEntityDetailsPage } from '../../common/common';
import { DELETE_TERM, LOGIN, NEW_GLOSSARY, NEW_GLOSSARY_TERMS, SEARCH_ENTITY_TABLE } from '../../constants/constants';

const createGlossaryTerm = (term) => {
  cy.get('[data-testid="header"]')
    .should('be.visible')
    .contains(NEW_GLOSSARY.name)
    .should('exist');
  cy.get('[data-testid="add-new-tag-button"]').should('be.visible').click();

  cy.contains('Add Glossary Term').should('be.visible');
  cy.get('[data-testid="name"]')
    .scrollIntoView()
    .should('be.visible')
    .type(term.name);
  cy.get(descriptionBox)
    .scrollIntoView()
    .should('be.visible')
    .type(term.description);
  cy.get('[data-testid="synonyms"]')
    .scrollIntoView()
    .should('be.visible')
    .type(term.synonyms);

  cy.get('[data-testid="references"] > .tw-flex > .button-comp')
    .scrollIntoView()
    .should('be.visible')
    .click();

  cy.get('#name-0').scrollIntoView().should('be.visible').type('test');
  cy.get('#url-0')
    .scrollIntoView()
    .should('be.visible')
    .type('https://test.com');

  interceptURL('POST', '/api/v1/glossaryTerms', 'createGlossaryTerms');
  cy.get('[data-testid="save-glossary-term"]')
    .scrollIntoView()
    .should('be.visible')
    .click();
  verifyResponseStatusCode('@createGlossaryTerms', 201);

  cy.get('#left-panelV1').contains(term.name).should('be.visible');
};

const deleteGlossary = ({ name }) => {
  verifyResponseStatusCode('@getGlossaryTerms', 200);
  cy.get('#left-panelV1').contains(name).should('be.visible').click();
  cy.wait(500);
  cy.get('[data-testid="inactive-link"]').contains(name).should('be.visible');

  cy.get('[data-testid="manage-button"]').should('be.visible').click();
  cy.get('[data-testid="delete-button"]')
    .scrollIntoView()
    .should('be.visible')
    .click();

  cy.get('.tw-modal-container').should('be.visible');
  cy.get('[data-testid="confirmation-text-input"]')
    .should('be.visible')
    .type(DELETE_TERM);

  cy.get('[data-testid="confirm-button"]')
    .should('be.visible')
    .should('not.disabled')
    .click();

  cy.get('.Toastify__toast-body')
    .contains('Glossary term deleted successfully!')
    .should('be.visible');

  cy.get('.Toastify__close-button > svg > path').should('be.visible').click();
  cy.get('.tw-modal-container').should('not.exist');
  cy.wait(500);
};

const goToAssetsTab = (term) => {
  cy.get('#left-panelV1').should('be.visible').contains(term).click();
  cy.wait(500);
  cy.get('[data-testid="inactive-link"]').contains(term).should('be.visible');
  cy.get('[data-testid="Assets"]').should('be.visible').click();
  cy.get('[data-testid="Assets"]').should('have.class', 'active');
};

describe('Glossary page should work properly', () => {
  beforeEach(() => {
    login(LOGIN.username, LOGIN.password);
    cy.goToHomePage();

    interceptURL('GET', '/api/v1/glossaryTerms*', 'getGlossaryTerms');
    cy.get('[data-testid="governance"]').should("exist").should("be.visible").click({ force: true })
    //Clicking on Glossary
    cy.get('[data-testid="appbar-item-glossary"]')
      .should('exist')
      .should('be.visible')
      .click({ force: true });

    // Todo: need to remove below uncaught exception once tree-view error resolves
    cy.on('uncaught:exception', () => {
      // return false to prevent the error from
      // failing this test
      return false;
    });
  });

  it('Create new glossary flow should work properly', () => {
    // check for no data placeholder
    cy.contains('Add New Glossary').should('be.visible');

    // Redirecting to add glossary page
    cy.get('[data-testid="add-webhook-button"]').should('be.visible').click();
    cy.get('.tw-form-container > .tw-heading')
      .contains('Add Glossary')
      .should('be.visible');

    cy.get('[data-testid="name"]')
      .scrollIntoView()
      .should('be.visible')
      .type(NEW_GLOSSARY.name);

    cy.get(descriptionBox)
      .scrollIntoView()
      .should('be.visible')
      .type(NEW_GLOSSARY.description);

    cy.get('[data-testid="add-reviewers"]')
      .scrollIntoView()
      .should('be.visible')
      .click();

    cy.get('.tw-modal-container').should('be.visible');

    cy.get('.tw-grid > [data-testid="user-card-container"]')
      .first()
      .should('be.visible')
      .as('reviewer');

    cy.get('@reviewer')
      .find('[data-testid="checkboxAddUser"]')
      .should('be.visible')
      .check();

    cy.get('[data-testid="saveButton"]').should('be.visible').click();
    cy.get('.tw-modal-container').should('not.exist');
    cy.get('[data-testid="reviewers-container"]')
      .children()
      .should('have.length', 1);

    cy.get('[data-testid="save-glossary"]')
      .scrollIntoView()
      .should('be.visible')
      .click();

    cy.get('[data-testid="inactive-link"]')
      .should('be.visible')
      .invoke('text')
      .then((text) => {
        expect(text).to.equal(NEW_GLOSSARY.name);
      });
  });

  it('Create glossary term should work properly', () => {
    const terms = Object.values(NEW_GLOSSARY_TERMS);

    terms.forEach(createGlossaryTerm);
  });

  it('Updating data of glossary should work properly', () => {
    const newDescription = 'Updated description';
    // updating tags
    cy.get('[data-testid="tag-container"]')
      .scrollIntoView()
      .should('be.visible')
      .click();

    cy.get('[class*="-control"]')
      .scrollIntoView()
      .should('be.visible')
      .type('personal');
    cy.get('[id*="-option-0"]').should('contain', 'Personal');

    cy.get('[id*="-option-0"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="saveAssociatedTag"]').scrollIntoView().click();
    cy.get('[data-testid="glossary-details"]')
      .scrollIntoView()
      .contains('PersonalData.Personal')
      .should('be.visible');

    // updating description
    cy.get('[data-testid="edit-description"]').should('be.visible').click();
    cy.get('.tw-modal-container').should('be.visible');
    cy.get(descriptionBox).should('be.visible').as('description');

    cy.get('@description').clear();
    cy.get('@description').type(newDescription);

    interceptURL('PATCH', '/api/v1/glossaries/*', 'saveGlossary');
    cy.get('[data-testid="save"]').click();

    cy.get('.tw-modal-container').should('not.exist');

    verifyResponseStatusCode('@saveGlossary', 200);

    cy.get('[data-testid="viewer-container"]')
      .contains(newDescription)
      .should('be.visible');
  });

  it('Updating data of glossary term should work properly', () => {
    interceptURL('GET', '/api/v1/permissions/*/*', 'permissionApi');
    interceptURL('GET', '/api/v1/search/query?*', 'glossaryAPI');
    const term = NEW_GLOSSARY_TERMS.term_1.name;
    const term2 = NEW_GLOSSARY_TERMS.term_2.name;
    const uSynonyms = ['pick up', 'take', 'obtain'];
    const newRef = { name: 'take', url: 'https://take.com' };
    const newDescription = 'Updated description';
    cy.get('#left-panelV1').should('be.visible').contains(term).click();
    cy.wait(500);
    verifyResponseStatusCode('@permissionApi', 200);
    verifyResponseStatusCode('@glossaryAPI', 200);

    // updating tags
    cy.get('[data-testid="tag-container"]')
      .scrollIntoView()
      .should('be.visible')
      .click();
    cy.get('[class*="-control"]')
      .scrollIntoView()
      .should('be.visible')
      .type('personal');
    cy.get('[id*="-option-0"]').should('contain', 'Personal');

    cy.get('[id*="-option-0"]').scrollIntoView().should('be.visible').click();

    interceptURL('PATCH', '/api/v1/glossaryTerms/*', 'saveData');
    cy.get('[data-testid="saveAssociatedTag"]').scrollIntoView().click();
    verifyResponseStatusCode('@saveData', 200);
    cy.get('[data-testid="glossary-term"]')
      .scrollIntoView()
      .contains('PersonalData.Personal')
      .should('be.visible');

    // updating description
    cy.get('[data-testid="edit-description"]').should('be.visible').click();
    cy.get('.tw-modal-container').should('be.visible');
    cy.get('.toastui-editor-md-container > .toastui-editor > .ProseMirror')
      .should('be.visible')
      .as('description');
    cy.get('@description').clear();
    cy.get('@description').type(newDescription);
    cy.get('[data-testid="save"]').click();
    verifyResponseStatusCode('@saveData', 200);
    cy.get('.tw-modal-container').should('not.exist');

    cy.get('[data-testid="viewer-container"]')
      .contains(newDescription)
      .should('be.visible');

    cy.get('[data-testid="inactive-link"]').contains(term).should('be.visible');

    // updating synonyms
    cy.get('[data-testid="section-synonyms"]')
      .scrollIntoView()
      .should('be.visible');

    cy.get('[data-testid="section-synonyms"] [data-testid="edit-button"]')
      .scrollIntoView()
      .should('be.visible')
      .should('not.be.disabled')
      .click();

    cy.get('.ant-select-selector').should('be.visible');
    cy.get('.ant-select-clear > .anticon > svg')
      .should('exist')
      .click({ force: true });

    cy.get('.ant-select-selection-overflow')
      .should('exist')
      .type(uSynonyms.join('{enter}'));

    interceptURL('PATCH', '/api/v1/glossaryTerms/*', 'getGlossary');
    cy.get('[data-testid="save-btn"]').should('be.visible').click();
    verifyResponseStatusCode('@getGlossary', 200);

    cy.get('[data-testid="synonyms-container"]')
      .as('synonyms-container')
      .should('be.visible');

    uSynonyms.forEach((synonym) => {
      cy.get('@synonyms-container').contains(synonym).should('be.visible');
    });

    // updating References
    cy.get('[data-testid="section-references"] [data-testid="edit-button"]')
      .should('exist')
      .click();

    cy.get('[data-testid="add-button"]').should('be.visible').click();
    cy.get('#references_1_name').should('be.visible').type(newRef.name);
    cy.get('#references_1_endpoint').should('be.visible').type(newRef.url);
    cy.get('[data-testid="save-btn"]').should('be.visible').click();
    verifyResponseStatusCode('@getGlossary', 200);
    cy.get('[data-testid="references-container"]')
      .contains(newRef.name)
      .should('be.visible')
      .invoke('attr', 'href')
      .should('eq', newRef.url);

    // add relented term
    cy.get('[data-testid="section-related-terms"]')
      .scrollIntoView()
      .should('be.visible');
    cy.get('[data-testid="section-related-terms"] [data-testid="edit-button"]')
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
    interceptURL(
      'GET',
      '/api/v1/search/query?q=*&from=0&size=10&index=glossary_search_index',
      'getGlossaryTerm'
    );
    cy.get('.ant-select-selection-overflow').should('be.visible').click();
    verifyResponseStatusCode('@getGlossaryTerm', 200);
    cy.get('.ant-select-item-option-content')
      .contains(term2)
      .should('be.visible')
      .click();

    interceptURL('PATCH', '/api/v1/glossaryTerms/*', 'getGlossary');
    cy.get('[data-testid="save-btn"]').should('be.visible').click();
    verifyResponseStatusCode('@getGlossary', 200);

    cy.get('[data-testid="related-term-container"]')
      .contains(term2)
      .should('be.visible');
  });

  it('Assets Tab should work properly', () => {
    const glossary = NEW_GLOSSARY.name;
    const term = NEW_GLOSSARY_TERMS.term_1.name;
    const entity = SEARCH_ENTITY_TABLE.table_3;
    goToAssetsTab(term);
    cy.contains('No assets available.').should('be.visible');
    cy.get('[data-testid="no-data-image"]').should('be.visible');
    visitEntityDetailsPage(entity.term, entity.serviceName, entity.entity);

    //Add tag to breadcrumb
    cy.get('[data-testid="tag-container"] [data-testid="tags"]')
      .eq(0)
      .should('be.visible')
      .click();
    cy.get('[class*="-control"]').should('be.visible').type(term);
    cy.get('[id*="-option-0"]').should('contain', term);
    cy.get('[id*="-option-0"]').should('be.visible').click();
    cy.get(
      '[data-testid="tags-wrapper"] [data-testid="tag-container"]'
    ).contains(term);

    interceptURL('GET', '/api/v1/feed/count*', 'saveTag');

    cy.get('[data-testid="saveAssociatedTag"]').should('be.visible').click();

    verifyResponseStatusCode('@saveTag', 200);
    cy.get('[data-testid="entity-tags"]')
      .scrollIntoView()
      .should('be.visible')
      .contains(term);

    //Add tag to schema table
    cy.get('[data-row-key="comments"] [data-testid="tags-wrapper"]')
      .should('be.visible')
      .click();
    cy.get('[class*="-control"]').should('be.visible').type(term);
    cy.get('[id*="-option-0"]').should('contain', term);
    cy.get('[id*="-option-0"]').should('be.visible').click();
    cy.get(
      '[data-row-key="comments"] [data-testid="tags-wrapper"] [data-testid="tag-container"]'
    ).contains(term);

    cy.get('[data-testid="saveAssociatedTag"]').should('be.visible').click();
    verifyResponseStatusCode('@saveTag', 200);
    cy.get(`[data-testid="tag-${glossary}.${term}"]`)
      .scrollIntoView()
      .should('be.visible')
      .contains(term);

    cy.get('[data-testid="governance"]').should("exist").should("be.visible").click({ force: true })
    cy.get('[data-testid="appbar-item-glossary"]')
      .should('exist')
      .should('be.visible')
      .click({ force: true });

    goToAssetsTab(term);
    cy.get(`[data-testid="${entity.serviceName}-${entity.term}"]`)
      .contains(entity.term)
      .should('be.visible');
  });

  it('Remove Glossary term from entity should work properly', () => {
    const term = NEW_GLOSSARY_TERMS.term_1.name;
    const entity = SEARCH_ENTITY_TABLE.table_3;

    interceptURL('GET', '/api/v1/search/query*', 'assetTab');
    // go assets tab
    goToAssetsTab(term);
    verifyResponseStatusCode('@assetTab', 200);

    interceptURL('GET', '/api/v1/feed*', 'entityDetails');
    cy.get(`[data-testid="${entity.serviceName}-${entity.term}"]`)
      .contains(entity.term)
      .should('be.visible')
      .click();
    verifyResponseStatusCode('@entityDetails', 200);
    // redirect to entity detail page
    cy.get('[data-testid="entity-tags"]')
      .find('[data-testid="edit-button"]')
      .scrollIntoView()
      .should('be.visible')
      .click();
    cy.get('[role="button"]').eq(0).should('be.visible').click();
    cy.get('[role="button"]').eq(0).should('be.visible').click();

    cy.get('[data-testid="saveAssociatedTag"]').scrollIntoView().click();

    //Remove the added column tag from entity

    cy.get('[data-testid="remove"]').eq(0).should('be.visible').click();

    cy.wait(500);
    cy.get('[data-testid="remove"]').eq(0).should('be.visible').click();

    cy.get('[data-testid="governance"]').should("exist").should("be.visible").click({ force: true })
    cy.get('[data-testid="appbar-item-glossary"]')
      .should('exist')
      .should('be.visible')
      .click({ force: true });

    cy.wait(500);
    goToAssetsTab(term);
    cy.contains('No assets available.').should('be.visible');
    cy.get('[data-testid="no-data-image"]').should('be.visible');
  });

  it('Delete glossary term should work properly', () => {
    const terms = Object.values(NEW_GLOSSARY_TERMS);

    terms.forEach(deleteGlossary);
  });

  it('Delete glossary should work properly', () => {
    verifyResponseStatusCode('@getGlossaryTerms', 200);
    cy.get('[data-testid="header"]')
      .should('be.visible')
      .contains(NEW_GLOSSARY.name)
      .should('exist');
    cy.get('[data-testid="manage-button"]').should('be.visible').click();
    cy.get('[data-testid="delete-button"]')
      .scrollIntoView()
      .should('be.visible')
      .click();

    cy.get('.tw-modal-container').should('be.visible');
    cy.get('[data-testid="confirmation-text-input"]')
      .should('be.visible')
      .type(DELETE_TERM);
    interceptURL('DELETE', '/api/v1/glossaries/*', 'getGlossary');
    cy.get('[data-testid="confirm-button"]')
      .should('be.visible')
      .should('not.disabled')
      .click();
    verifyResponseStatusCode('@getGlossary', 200);

    cy.get('.Toastify__toast-body')
      .contains('Glossary deleted successfully!')
      .should('be.visible');

    cy.get('.Toastify__close-button > svg > path').should('be.visible').click();
    cy.contains('Add New Glossary').should('be.visible');
  });
});
