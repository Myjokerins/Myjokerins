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

package org.openmetadata.service.resources.services;

import static javax.ws.rs.core.Response.Status.BAD_REQUEST;
import static javax.ws.rs.core.Response.Status.OK;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.openmetadata.service.util.EntityUtil.fieldAdded;
import static org.openmetadata.service.util.EntityUtil.fieldUpdated;
import static org.openmetadata.service.util.TestUtils.ADMIN_AUTH_HEADERS;
import static org.openmetadata.service.util.TestUtils.INGESTION_BOT_AUTH_HEADERS;
import static org.openmetadata.service.util.TestUtils.TEST_AUTH_HEADERS;
import static org.openmetadata.service.util.TestUtils.assertResponse;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.HttpResponseException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.openmetadata.schema.api.data.CreateChart;
import org.openmetadata.schema.api.services.CreateDashboardService;
import org.openmetadata.schema.api.services.CreateDashboardService.DashboardServiceType;
import org.openmetadata.schema.entity.data.Chart;
import org.openmetadata.schema.entity.services.DashboardService;
import org.openmetadata.schema.services.connections.dashboard.LookerConnection;
import org.openmetadata.schema.services.connections.dashboard.SupersetConnection;
import org.openmetadata.schema.type.ChangeDescription;
import org.openmetadata.schema.type.DashboardConnection;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.EntityResourceTest;
import org.openmetadata.service.resources.charts.ChartResourceTest;
import org.openmetadata.service.resources.services.dashboard.DashboardServiceResource.DashboardServiceList;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.TestUtils;
import org.openmetadata.service.util.TestUtils.UpdateType;

@Slf4j
public class DashboardServiceResourceTest extends EntityResourceTest<DashboardService, CreateDashboardService> {
  public DashboardServiceResourceTest() {
    super(
        Entity.DASHBOARD_SERVICE,
        DashboardService.class,
        DashboardServiceList.class,
        "services/dashboardServices",
        "owner");
    this.supportsPatch = false;
    this.supportsAuthorizedMetadataOperations = false;
  }

  @Test
  void post_withoutRequiredFields_400_badRequest(TestInfo test) {
    // Create dashboard with mandatory serviceType field empty
    assertResponse(
        () -> createEntity(createRequest(test).withServiceType(null), ADMIN_AUTH_HEADERS),
        BAD_REQUEST,
        "[serviceType must not be null]");

    // Create dashboard with mandatory dashboardUrl field empty
    assertResponse(
        () -> createEntity(createRequest(test).withConnection(null), ADMIN_AUTH_HEADERS),
        BAD_REQUEST,
        "[connection must not be null]");
  }

  @Test
  void post_validService_as_admin_200_ok(TestInfo test) throws IOException, URISyntaxException {
    // Create dashboard service with different optional fields
    Map<String, String> authHeaders = ADMIN_AUTH_HEADERS;
    SupersetConnection supersetConnection =
        new SupersetConnection()
            .withHostPort(new URI("http://localhost:8080"))
            .withUsername("user")
            .withPassword("password");
    createAndCheckEntity(createRequest(test, 1).withDescription(null), authHeaders);
    createAndCheckEntity(createRequest(test, 2).withDescription("description"), authHeaders);
    createAndCheckEntity(
        createRequest(test, 3).withConnection(new DashboardConnection().withConfig(supersetConnection)), authHeaders);
  }

  @Test
  void put_updateService_as_admin_2xx(TestInfo test) throws IOException, URISyntaxException {
    DashboardConnection dashboardConnection =
        new DashboardConnection()
            .withConfig(new SupersetConnection().withHostPort(new URI("http://localhost:8080")).withUsername("user"));
    DashboardService service =
        createAndCheckEntity(
            createRequest(test).withDescription(null).withConnection(dashboardConnection), ADMIN_AUTH_HEADERS);

    // Update dashboard description and ingestion service that are null
    DashboardConnection dashboardConnection1 =
        new DashboardConnection()
            .withConfig(new SupersetConnection().withHostPort(new URI("http://localhost:9000")).withUsername("user1"));

    CreateDashboardService update =
        createRequest(test).withDescription("description1").withConnection(dashboardConnection1);

    ChangeDescription change = getChangeDescription(service.getVersion());
    fieldAdded(change, "description", "description1");
    fieldUpdated(change, "connection", dashboardConnection, dashboardConnection1);
    DashboardService updatedService =
        updateAndCheckEntity(update, OK, ADMIN_AUTH_HEADERS, UpdateType.MINOR_UPDATE, change);
    validateConnection(
        update.getConnection(), updatedService.getConnection(), updatedService.getServiceType(), ADMIN_AUTH_HEADERS);
    change = getChangeDescription(updatedService.getVersion());
    updatedService = getEntity(service.getId(), TEST_AUTH_HEADERS);
    assertNotNull(updatedService.getConnection());
    assertNotNull(
        JsonUtils.readValue(JsonUtils.pojoToJson(updatedService.getConnection().getConfig()), SupersetConnection.class)
            .getHostPort());
    assertNull(
        JsonUtils.readValue(JsonUtils.pojoToJson(updatedService.getConnection().getConfig()), SupersetConnection.class)
            .getUsername());
    SupersetConnection supersetConnection =
        new SupersetConnection().withHostPort(new URI("http://localhost:8080")).withUsername("user");
    DashboardConnection dashboardConnection2 = new DashboardConnection().withConfig(supersetConnection);
    update = createRequest(test).withDescription("description1").withConnection(dashboardConnection2);

    fieldUpdated(change, "connection", dashboardConnection1, dashboardConnection2);
    updateAndCheckEntity(update, OK, ADMIN_AUTH_HEADERS, UpdateType.MINOR_UPDATE, change);
    updatedService = getEntity(service.getId(), ADMIN_AUTH_HEADERS);
    validateConnection(
        dashboardConnection2, updatedService.getConnection(), updatedService.getServiceType(), ADMIN_AUTH_HEADERS);
  }

  @Override
  public CreateDashboardService createRequest(String name) {
    try {
      return new CreateDashboardService()
          .withName(name)
          .withServiceType(CreateDashboardService.DashboardServiceType.Superset)
          .withConnection(
              new DashboardConnection()
                  .withConfig(
                      new SupersetConnection()
                          .withHostPort(new URI("http://localhost:8080"))
                          .withUsername("admin")
                          .withPassword("admin")));
    } catch (URISyntaxException e) {
      e.printStackTrace();
    }
    return null;
  }

  @Override
  public void validateCreatedEntity(
      DashboardService service, CreateDashboardService createRequest, Map<String, String> authHeaders) {
    assertEquals(createRequest.getName(), service.getName());
    DashboardConnection expectedConnection = createRequest.getConnection();
    DashboardConnection actualConnection = service.getConnection();
    validateConnection(expectedConnection, actualConnection, service.getServiceType(), authHeaders);
  }

  @Override
  public void compareEntities(DashboardService expected, DashboardService updated, Map<String, String> authHeaders) {
    // PATCH operation is not supported by this entity
  }

  @Override
  public DashboardService validateGetWithDifferentFields(DashboardService service, boolean byName)
      throws HttpResponseException {
    String fields = "";
    service =
        byName
            ? getEntityByName(service.getFullyQualifiedName(), fields, ADMIN_AUTH_HEADERS)
            : getEntity(service.getId(), fields, ADMIN_AUTH_HEADERS);
    TestUtils.assertListNull(service.getOwner());

    fields = "owner";
    service =
        byName
            ? getEntityByName(service.getFullyQualifiedName(), fields, ADMIN_AUTH_HEADERS)
            : getEntity(service.getId(), fields, ADMIN_AUTH_HEADERS);
    // Checks for other owner, tags, and followers is done in the base class
    return service;
  }

  @Override
  public void assertFieldChange(String fieldName, Object expected, Object actual) throws IOException {
    if (fieldName.equals("connection")) {
      assertTrue(((String) actual).contains("-encrypted-value"));
    } else {
      super.assertCommonFieldChange(fieldName, expected, actual);
    }
  }

  private void validateConnection(
      DashboardConnection expectedDashboardConnection,
      DashboardConnection actualDashboardConnection,
      DashboardServiceType dashboardServiceType,
      Map<String, String> authHeaders) {
    if (expectedDashboardConnection != null && actualDashboardConnection != null) {
      if (dashboardServiceType == CreateDashboardService.DashboardServiceType.Superset) {
        SupersetConnection expectedSupersetConnection = (SupersetConnection) expectedDashboardConnection.getConfig();
        SupersetConnection actualSupersetConnection;
        if (actualDashboardConnection.getConfig() instanceof SupersetConnection) {
          actualSupersetConnection = (SupersetConnection) actualDashboardConnection.getConfig();
        } else {
          actualSupersetConnection =
              JsonUtils.convertValue(actualDashboardConnection.getConfig(), SupersetConnection.class);
        }
        assertEquals(expectedSupersetConnection.getHostPort(), actualSupersetConnection.getHostPort());
        assertEquals(expectedSupersetConnection.getProvider(), actualSupersetConnection.getProvider());
        if (ADMIN_AUTH_HEADERS.equals(authHeaders)) {
          assertEquals(expectedSupersetConnection.getUsername(), actualSupersetConnection.getUsername());
          assertEquals(expectedSupersetConnection.getPassword(), actualSupersetConnection.getPassword());
          assertEquals(expectedSupersetConnection.getProvider(), actualSupersetConnection.getProvider());
        } else if (INGESTION_BOT_AUTH_HEADERS.equals(authHeaders)) {
          assertNull(actualSupersetConnection.getUsername());
          assertNull(actualSupersetConnection.getPassword());
        }
      }
    }
  }

  public void setupDashboardServices(TestInfo test) throws HttpResponseException, URISyntaxException {
    DashboardServiceResourceTest dashboardResourceTest = new DashboardServiceResourceTest();
    CreateDashboardService createDashboardService =
        dashboardResourceTest.createRequest("superset", "", "", null).withServiceType(DashboardServiceType.Superset);
    DashboardConnection dashboardConnection =
        new DashboardConnection()
            .withConfig(
                new SupersetConnection()
                    .withHostPort(new URI("http://localhost:8080"))
                    .withPassword("test")
                    .withUsername("admin"));
    createDashboardService.withConnection(dashboardConnection);
    DashboardService dashboardService =
        new DashboardServiceResourceTest().createEntity(createDashboardService, ADMIN_AUTH_HEADERS);
    SUPERSET_REFERENCE = dashboardService.getEntityReference();

    CreateDashboardService lookerDashboardService =
        dashboardResourceTest.createRequest("looker", "", "", null).withServiceType(DashboardServiceType.Looker);
    DashboardConnection lookerConnection =
        new DashboardConnection()
            .withConfig(
                new LookerConnection()
                    .withHostPort(new URI("http://localhost:8080"))
                    .withClientId("test")
                    .withClientSecret("test"));
    lookerDashboardService.withConnection(lookerConnection);
    dashboardService = new DashboardServiceResourceTest().createEntity(lookerDashboardService, ADMIN_AUTH_HEADERS);
    LOOKER_REFERENCE = dashboardService.getEntityReference();
    CHART_REFERENCES = new ArrayList<>();
    ChartResourceTest chartResourceTest = new ChartResourceTest();
    for (int i = 0; i < 3; i++) {
      CreateChart createChart = chartResourceTest.createRequest(test, i).withService(SUPERSET_REFERENCE);
      Chart chart = chartResourceTest.createEntity(createChart, ADMIN_AUTH_HEADERS);
      CHART_REFERENCES.add(chart.getEntityReference());
    }
  }
}
