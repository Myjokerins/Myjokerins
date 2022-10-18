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

import { getCurrentLocaleDate, getFutureLocaleDateFromCurrentDate } from "../../../src/utils/TimeUtils";
import { descriptionBox, login, visitEntityDetailsPage } from "../../common/common";
import { ANNOUNCEMENT_ENTITIES, LOGIN } from "../../constants/constants";



describe("Entity Announcement", () => {
  beforeEach(() => {
    login(LOGIN.username, LOGIN.password);
    cy.goToHomePage();
  });

  const createAnnouncement = (title, startDate, endDate, description) => {
    cy.get('[data-testid="add-announcement"]').should('be.visible').click();
    cy.get('.ant-modal-header')
      .should('be.visible')
      .contains('Make an announcement');
    cy.get('.ant-modal-body').should('be.visible');
    
    cy.get('#title').should('be.visible').type(title);
    cy.get('#startDate').should('be.visible').type(startDate);
    cy.get('#endtDate').should('be.visible').type(endDate);
    cy.get(descriptionBox).type(description);

    cy.get('.ant-modal-footer > .ant-btn-primary')
      .should('be.visible')
      .contains('Submit')
      .scrollIntoView()
      .click();
  }

  const addAnnouncement = (value) => {
    const startDate = getCurrentLocaleDate();
    const endDate = getFutureLocaleDateFromCurrentDate(5);
    visitEntityDetailsPage(value.term, value.serviceName, value.entity);

    cy.get('[data-testid="manage-button"]').should('be.visible').click();
    cy.get('[data-testid="announcement-button"]').should('be.visible').click();
    cy.get('[data-testid="announcement-error"]')
      .should('be.visible')
      .contains('No Announcements, Click on add announcement to add one.');
    
    // Create Active Announcement
    createAnnouncement("Announcement Title", startDate, endDate, "Announcement Description")

    // wait time for success toast message
    cy.wait(5000);
    
    // Create InActive Announcement
    const InActiveStartDate = getFutureLocaleDateFromCurrentDate(6);
    const InActiveEndDate = getFutureLocaleDateFromCurrentDate(11);

    createAnnouncement("InActive Announcement Title",InActiveStartDate,InActiveEndDate,"InActive Announcement Description")

     // wait time for success toast message
    cy.wait(5000);
   
     // check for inActive-announcement
    cy.get('[data-testid="inActive-announcements"]').should('be.visible');

    // close announcement drawer
    cy.get('.anticon > svg').should('be.visible').click();

    // reload page to get the active announcement card
    cy.reload();

    // check for announcement card on entity page
    cy.get('[data-testid="announcement-card"]').should('be.visible');
  };

  

  ANNOUNCEMENT_ENTITIES.forEach((entity) => {
    it(`Add announcement and verify the active announcement for ${entity.entity}`, () => {
      addAnnouncement(entity)
    })
  })
})