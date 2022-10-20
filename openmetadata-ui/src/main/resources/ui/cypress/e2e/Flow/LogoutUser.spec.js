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

import { interceptURL, login, verifyResponseStatusCode } from "../../common/common";
import { BASE_URL, LOGIN } from "../../constants/constants";

describe("Logout User", () => {
  beforeEach(() => {
    login(LOGIN.username, LOGIN.password);
    cy.goToHomePage();
  });

  it("After login logout the user and invalidate the token", () => {
    
    cy.get('[data-testid="avatar"]').should("be.visible").click()

    interceptURL('POST', '/api/v1/users/logout', 'logoutUser');
    
    cy.get('[data-testid="menu-item-Logout"]').should("be.visible").click()

    // verify the logout request
    verifyResponseStatusCode('@logoutUser', 200);

    cy.url().should('eq', `${BASE_URL}/signin`);
  })
})