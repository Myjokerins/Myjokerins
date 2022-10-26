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

package org.openmetadata.service.resources.events;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.openmetadata.service.util.EntityUtil.fieldAdded;
import static org.openmetadata.service.util.EntityUtil.fieldDeleted;
import static org.openmetadata.service.util.EntityUtil.fieldUpdated;
import static org.openmetadata.service.util.TestUtils.ADMIN_AUTH_HEADERS;

import com.fasterxml.jackson.core.type.TypeReference;
import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.ws.rs.core.Response;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.HttpResponseException;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.openmetadata.schema.api.events.CreateWebhook;
import org.openmetadata.schema.filter.EventFilter;
import org.openmetadata.schema.filter.Filters;
import org.openmetadata.schema.type.ChangeDescription;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.schema.type.EventType;
import org.openmetadata.schema.type.FailureDetails;
import org.openmetadata.schema.type.Webhook;
import org.openmetadata.schema.type.Webhook.Status;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.EntityResourceTest;
import org.openmetadata.service.resources.events.WebhookCallbackResource.EventDetails;
import org.openmetadata.service.resources.events.WebhookResource.WebhookList;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.TestUtils.UpdateType;

@Slf4j
public class WebhookResourceTest extends EntityResourceTest<Webhook, CreateWebhook> {
  public static final List<EventFilter> ALL_EVENTS_FILTER = new ArrayList<>();

  static {
    Set<String> allFilter = new HashSet<>();
    allFilter.add("all");
    EventFilter allEntityFilter = new EventFilter();
    allEntityFilter.setEntityType("all");
    allEntityFilter.setFilters(
        List.of(
            new Filters().withEventType(EventType.ENTITY_CREATED).withInclude(allFilter).withExclude(new HashSet<>()),
            new Filters().withEventType(EventType.ENTITY_UPDATED).withInclude(allFilter).withExclude(new HashSet<>()),
            new Filters().withEventType(EventType.ENTITY_DELETED).withInclude(allFilter).withExclude(new HashSet<>()),
            new Filters()
                .withEventType(EventType.ENTITY_SOFT_DELETED)
                .withInclude(allFilter)
                .withExclude(new HashSet<>())));
    ALL_EVENTS_FILTER.add(allEntityFilter);
  }

  public WebhookResourceTest() {
    super(Entity.WEBHOOK, Webhook.class, WebhookList.class, "webhook", "");
    supportsAuthorizedMetadataOperations = false;
    supportsPatch = false;
    supportsFieldsQueryParam = false;
  }

  @Test
  void post_webhookEnabledStateChange(TestInfo test) throws IOException {
    //
    // Create webhook in disabled state. It will not start webhook publisher
    //
    String webhookName = getEntityName(test);
    LOG.info("creating webhook in disabled state");
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/" + webhookName;
    CreateWebhook create =
        createRequest(webhookName, "", "", null).withEnabled(false).withEndpoint(URI.create(uri)).withBatchSize(10);
    Webhook webhook = createAndCheckEntity(create, ADMIN_AUTH_HEADERS);
    assertEquals(Status.DISABLED, webhook.getStatus());
    Webhook getWebhook = getEntity(webhook.getId(), ADMIN_AUTH_HEADERS);
    assertEquals(Status.DISABLED, getWebhook.getStatus());
    EventDetails details = webhookCallbackResource.getEventDetails(webhookName);
    assertNull(details);

    //
    // Now enable the webhook
    //
    LOG.info("Enabling webhook");
    ChangeDescription change = getChangeDescription(webhook.getVersion());
    fieldUpdated(change, "enabled", false, true);
    fieldUpdated(change, "status", Status.DISABLED, Status.ACTIVE);
    fieldUpdated(change, "batchSize", 10, 50);
    create.withEnabled(true).withBatchSize(50);

    webhook = updateAndCheckEntity(create, Response.Status.OK, ADMIN_AUTH_HEADERS, UpdateType.MINOR_UPDATE, change);
    assertEquals(Status.ACTIVE, webhook.getStatus());
    getWebhook = getEntity(webhook.getId(), ADMIN_AUTH_HEADERS);
    assertEquals(Status.ACTIVE, getWebhook.getStatus());

    // Ensure the call back notification has started
    details = waitForFirstEvent(webhookName, 25);
    assertEquals(1, details.getEvents().size());
    long lastSuccessfulEventTime = details.getLatestEventTime();
    FailureDetails failureDetails = new FailureDetails().withLastSuccessfulAt(lastSuccessfulEventTime);

    //
    // Disable the webhook and ensure notification is disabled
    //
    LOG.info("Disabling webhook");
    create.withEnabled(false);
    change = getChangeDescription(getWebhook.getVersion());
    fieldAdded(change, "failureDetails", JsonUtils.pojoToJson(failureDetails));
    fieldUpdated(change, "enabled", true, false);
    fieldUpdated(change, "status", Status.ACTIVE, Status.DISABLED);

    // Disabled webhook state is DISABLED
    getWebhook = updateAndCheckEntity(create, Response.Status.OK, ADMIN_AUTH_HEADERS, UpdateType.MINOR_UPDATE, change);
    assertEquals(Status.DISABLED, getWebhook.getStatus());

    // Disabled webhook state also records last successful time when event was sent
    getWebhook = getEntity(webhook.getId(), ADMIN_AUTH_HEADERS);
    assertEquals(Status.DISABLED, getWebhook.getStatus());
    assertEquals(details.getFirstEventTime(), getWebhook.getFailureDetails().getLastSuccessfulAt());

    // Ensure callback back notification is disabled with no new events
    int iterations = 0;
    while (iterations < 10) {
      Awaitility.await().atLeast(Duration.ofMillis(100L)).untilTrue(new AtomicBoolean(true));
      iterations++;
      assertEquals(1, details.getEvents().size()); // Event counter remains the same
    }

    deleteEntity(webhook.getId(), ADMIN_AUTH_HEADERS);
  }

  @Test
  void put_updateEndpointURL(TestInfo test) throws IOException {
    // Create webhook with invalid URL
    CreateWebhook create =
        createRequest("counter", "", "", null).withEnabled(true).withEndpoint(URI.create("http://invalidUnknowHost"));
    Webhook webhook = createAndCheckEntity(create, ADMIN_AUTH_HEADERS);

    // Wait for webhook to be marked as failed
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(hasWebHookFailed(webhook.getId()));
    Webhook getWebhook = getEntity(webhook.getId(), ADMIN_AUTH_HEADERS);
    assertEquals(Status.FAILED, getWebhook.getStatus());

    // Get webhook again to reflect the version change (when marked as failed)
    getWebhook = getEntity(webhook.getId(), ADMIN_AUTH_HEADERS);
    FailureDetails failureDetails = getWebhook.getFailureDetails();

    // Now change the webhook URL to a valid URL and ensure callbacks resume
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/" + test.getDisplayName();
    create = create.withEndpoint(URI.create(baseUri));
    ChangeDescription change = getChangeDescription(getWebhook.getVersion());
    fieldUpdated(change, "endPoint", webhook.getEndpoint(), create.getEndpoint());
    fieldUpdated(change, "status", Status.FAILED, Status.ACTIVE);
    fieldDeleted(change, "failureDetails", JsonUtils.pojoToJson(failureDetails));

    webhook = updateAndCheckEntity(create, Response.Status.OK, ADMIN_AUTH_HEADERS, UpdateType.MINOR_UPDATE, change);
    deleteEntity(webhook.getId(), ADMIN_AUTH_HEADERS);
  }

  private AtomicBoolean hasWebHookFailed(UUID webhookId) throws HttpResponseException {
    Webhook getWebhook = getEntity(webhookId, ADMIN_AUTH_HEADERS);
    LOG.info("webhook status {}", getWebhook.getStatus());
    return new AtomicBoolean(getWebhook.getStatus() == Status.FAILED);
  }

  @Test
  void put_updateWebhookFilter(TestInfo test) throws IOException {
    String endpoint =
        "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/counter/" + test.getDisplayName();

    Set<String> allFilter = new HashSet<>();
    allFilter.add("all");

    Filters createFilter =
        new Filters().withEventType(EventType.ENTITY_CREATED).withInclude(allFilter).withExclude(new HashSet<>());
    Filters updateFilter =
        new Filters().withEventType(EventType.ENTITY_UPDATED).withInclude(allFilter).withExclude(new HashSet<>());
    Filters deleteFilter =
        new Filters().withEventType(EventType.ENTITY_DELETED).withInclude(allFilter).withExclude(new HashSet<>());

    EventFilter f1 = new EventFilter().withEntityType("all").withFilters(List.of(createFilter));
    EventFilter f2 =
        new EventFilter().withEntityType("all").withFilters(List.of(createFilter, updateFilter, deleteFilter));
    EventFilter f3 = new EventFilter().withEntityType("all").withFilters(List.of(updateFilter, deleteFilter));
    EventFilter f4 = new EventFilter().withEntityType("all").withFilters(List.of(updateFilter));

    CreateWebhook create =
        createRequest("filterUpdate", "", "", null)
            .withEnabled(false)
            .withEndpoint(URI.create(endpoint))
            .withEventFilters(List.of(f1));
    Webhook webhook = createAndCheckEntity(create, ADMIN_AUTH_HEADERS);

    // Now update the filter to include entity updated and deleted events
    create.setEventFilters(List.of(f2));
    ChangeDescription change = getChangeDescription(webhook.getVersion());
    fieldAdded(change, "eventFilters", List.of(f2));
    fieldDeleted(change, "eventFilters", List.of(f1));
    webhook = updateAndCheckEntity(create, Response.Status.OK, ADMIN_AUTH_HEADERS, UpdateType.MINOR_UPDATE, change);

    // Now remove the filter for entityCreated
    create.setEventFilters(List.of(f3));
    change = getChangeDescription(webhook.getVersion());
    fieldAdded(change, "eventFilters", List.of(f3));
    fieldDeleted(change, "eventFilters", List.of(f2));
    webhook = updateAndCheckEntity(create, Response.Status.OK, ADMIN_AUTH_HEADERS, UpdateType.MINOR_UPDATE, change);

    // Now remove the filter for entityDeleted
    create.setEventFilters(List.of(f4));
    change = getChangeDescription(webhook.getVersion());
    fieldAdded(change, "eventFilters", List.of(f4));
    fieldDeleted(change, "eventFilters", List.of(f3));
    webhook = updateAndCheckEntity(create, Response.Status.OK, ADMIN_AUTH_HEADERS, UpdateType.MINOR_UPDATE, change);

    deleteEntity(webhook.getId(), ADMIN_AUTH_HEADERS);
  }

  @Override
  public CreateWebhook createRequest(String name) {
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/ignore";
    return new CreateWebhook()
        .withName(name)
        .withEventFilters(ALL_EVENTS_FILTER)
        .withEndpoint(URI.create(uri))
        .withBatchSize(100)
        .withEnabled(false)
        .withSecretKey("webhookTest");
  }

  @Override
  public void validateCreatedEntity(Webhook webhook, CreateWebhook createRequest, Map<String, String> authHeaders) {
    assertEquals(createRequest.getName(), webhook.getName());
    List<EventFilter> filters = createRequest.getEventFilters();
    assertEquals(filters, webhook.getEventFilters());
  }

  @Override
  public void compareEntities(Webhook expected, Webhook updated, Map<String, String> authHeaders) {
    // Patch not supported
  }

  @Override
  public Webhook validateGetWithDifferentFields(Webhook entity, boolean byName) {
    return entity; // Nothing to validate
  }

  @Override
  public void assertFieldChange(String fieldName, Object expected, Object actual) throws IOException {
    if (expected == actual) {
      return;
    }
    switch (fieldName) {
      case "eventFilters":
        List<EventFilter> expectedFilters = (List<EventFilter>) expected;
        List<EventFilter> actualFilters =
            JsonUtils.readValue(actual.toString(), new TypeReference<ArrayList<EventFilter>>() {});
        assertEquals(expectedFilters, actualFilters);
        break;
      case "endPoint":
        URI expectedEndpoint = (URI) expected;
        URI actualEndpoint = URI.create(actual.toString());
        assertEquals(expectedEndpoint, actualEndpoint);
        break;
      case "status":
        assertEquals(expected, Status.fromValue(actual.toString()));
        break;
      default:
        assertCommonFieldChange(fieldName, expected, actual);
        break;
    }
  }

  @Test
  void put_entityNonEmptyDescriptionUpdate_200(TestInfo test) {
    // TODO fix this test as currently bot can't update webhook
  }

  /**
   * Before a test for every entity resource, create a webhook subscription. At the end of the test, ensure all events
   * are delivered over web subscription comparing it with number of events stored in the system.
   */
  public void startWebhookSubscription() throws IOException {
    // Valid webhook callback
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/healthy";
    createWebhook("healthy", baseUri);
  }

  /** Start webhook subscription for given entity and various event types */
  public void startWebhookEntitySubscriptions(String entity) throws IOException {
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/filterBased";

    // Create webhook with endpoint api/v1/test/webhook/entityCreated/<entity> to receive entityCreated events
    String name = EventType.ENTITY_CREATED + ":" + entity;
    String uri = baseUri + "/" + EventType.ENTITY_CREATED + "/" + entity;

    Set<String> allFilter = new HashSet<>();
    allFilter.add("all");
    Filters createFilter =
        new Filters().withEventType(EventType.ENTITY_CREATED).withInclude(allFilter).withExclude(new HashSet<>());
    EventFilter f1 = new EventFilter().withEntityType(entity).withFilters(List.of(createFilter));
    createWebhook(name, uri, List.of(f1));

    // Create webhook with endpoint api/v1/test/webhook/entityUpdated/<entity> to receive entityUpdated events
    name = EventType.ENTITY_UPDATED + ":" + entity;
    uri = baseUri + "/" + EventType.ENTITY_UPDATED + "/" + entity;
    Filters updateFilter =
        new Filters().withEventType(EventType.ENTITY_UPDATED).withInclude(allFilter).withExclude(new HashSet<>());
    EventFilter f2 = new EventFilter().withEntityType(entity).withFilters(List.of(updateFilter));
    createWebhook(name, uri, List.of(f2));

    // TODO entity deleted events
  }

  /**
   * At the end of the test, ensure all events are delivered over web subscription comparing it with number of events
   * stored in the system.
   */
  public void validateWebhookEvents() throws HttpResponseException {
    // Check the healthy callback server received all the change events
    EventDetails details = webhookCallbackResource.getEventDetails("healthy");
    assertNotNull(details);
    ConcurrentLinkedQueue<ChangeEvent> callbackEvents = details.getEvents();
    assertNotNull(callbackEvents);
    assertNotNull(callbackEvents.peek());
    waitAndCheckForEvents("*", "*", "*", callbackEvents.peek().getTimestamp(), callbackEvents, 40);
    assertWebhookStatusSuccess("healthy");
  }

  /** At the end of the test, ensure all events are delivered for the combination of entity and eventTypes */
  public void validateWebhookEntityEvents(String entity) throws HttpResponseException {
    // Check the healthy callback server received all the change events
    // For the entity all the webhooks registered for created events have the right number of events
    List<ChangeEvent> callbackEvents =
        webhookCallbackResource.getEntityCallbackEvents(EventType.ENTITY_CREATED, entity);
    assertTrue(callbackEvents.size() > 1);
    long timestamp = callbackEvents.get(0).getTimestamp();
    waitAndCheckForEvents(entity, null, null, timestamp, callbackEvents, 30);

    // For the entity all the webhooks registered for updated events have the right number of events
    callbackEvents = webhookCallbackResource.getEntityCallbackEvents(EventType.ENTITY_UPDATED, entity);
    // Use previous date if no update events
    timestamp = callbackEvents.size() > 0 ? callbackEvents.get(0).getTimestamp() : timestamp;
    waitAndCheckForEvents(null, entity, null, timestamp, callbackEvents, 30);

    // TODO add delete event support
  }

  @Test
  void testDifferentTypesOfWebhooks() throws IOException {
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook";

    // Create multiple webhooks each with different type of response to callback
    Webhook w1 = createWebhook("slowServer", baseUri + "/simulate/slowServer"); // Callback response 1 second slower
    Webhook w2 = createWebhook("callbackTimeout", baseUri + "/simulate/timeout"); // Callback response 12 seconds slower
    Webhook w3 = createWebhook("callbackResponse300", baseUri + "/simulate/300"); // 3xx response
    Webhook w4 = createWebhook("callbackResponse400", baseUri + "/simulate/400"); // 4xx response
    Webhook w5 = createWebhook("callbackResponse500", baseUri + "/simulate/500"); // 5xx response
    Webhook w6 = createWebhook("invalidEndpoint", "http://invalidUnknownHost"); // Invalid URL

    // Now check state of webhooks created
    EventDetails details = waitForFirstEvent("simulate-slowServer", 25);
    ConcurrentLinkedQueue<ChangeEvent> callbackEvents = details.getEvents();
    assertNotNull(callbackEvents.peek());

    waitAndCheckForEvents("*", "*", "*", callbackEvents.peek().getTimestamp(), callbackEvents, 30);

    // Check all webhook status
    assertWebhookStatusSuccess("slowServer");
    assertWebhookStatus("callbackResponse300", Status.FAILED, 301, "Moved Permanently");
    assertWebhookStatus("callbackResponse400", Status.AWAITING_RETRY, 400, "Bad Request");
    assertWebhookStatus("callbackResponse500", Status.AWAITING_RETRY, 500, "Internal Server Error");
    assertWebhookStatus("invalidEndpoint", Status.FAILED, null, "UnknownHostException");

    // Delete all webhooks
    deleteEntity(w1.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w2.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w3.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w4.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w5.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w6.getId(), ADMIN_AUTH_HEADERS);
  }

  public Webhook createWebhook(String name, String uri) throws IOException {
    return createWebhook(name, uri, ALL_EVENTS_FILTER);
  }

  public Webhook createWebhook(String name, String uri, List<EventFilter> filters) throws IOException {
    CreateWebhook createWebhook =
        createRequest(name, "", "", null).withEndpoint(URI.create(uri)).withEventFilters(filters).withEnabled(true);
    return createAndCheckEntity(createWebhook, ADMIN_AUTH_HEADERS);
  }

  public void assertWebhookStatusSuccess(String name) throws HttpResponseException {
    Webhook webhook = getEntityByName(name, null, "", ADMIN_AUTH_HEADERS);
    assertEquals(Status.ACTIVE, webhook.getStatus());
    assertNull(webhook.getFailureDetails());
  }

  public void assertWebhookStatus(String name, Status status, Integer statusCode, String failedReason)
      throws HttpResponseException {
    Webhook webhook = getEntityByName(name, null, "", ADMIN_AUTH_HEADERS);
    assertEquals(status, webhook.getStatus());
    assertEquals(statusCode, webhook.getFailureDetails().getLastFailedStatusCode());
    assertEquals(failedReason, webhook.getFailureDetails().getLastFailedReason());
  }

  private static AtomicBoolean receivedAllEvents(List<ChangeEvent> expected, Collection<ChangeEvent> callbackEvents) {
    LOG.info("expected size {} callback events size {}", expected.size(), callbackEvents.size());
    return new AtomicBoolean(expected.size() == callbackEvents.size());
  }

  public void waitAndCheckForEvents(
      String entityCreated,
      String entityUpdated,
      String entityDeleted,
      long timestamp,
      Collection<ChangeEvent> callbackEvents,
      int iteration)
      throws HttpResponseException {
    List<ChangeEvent> expected =
        getChangeEvents(entityCreated, entityUpdated, entityDeleted, timestamp, ADMIN_AUTH_HEADERS).getData();
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(iteration * 100L))
        .untilTrue(receivedAllEvents(expected, callbackEvents));
    if (expected.size() != callbackEvents.size()) { // Failed to receive all the events
      expected.forEach(
          c1 ->
              LOG.info(
                  "expected {}:{}:{}:{}", c1.getTimestamp(), c1.getEventType(), c1.getEntityType(), c1.getEntityId()));
      callbackEvents.forEach(
          c1 ->
              LOG.info(
                  "received {}:{}:{}:{}", c1.getTimestamp(), c1.getEventType(), c1.getEntityType(), c1.getEntityId()));
    }
    assertEquals(expected.size(), callbackEvents.size());
  }

  public EventDetails waitForFirstEvent(String endpoint, int iteration) {
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(iteration * 100L))
        .untilFalse(hasEventOccurred(endpoint));
    EventDetails details = webhookCallbackResource.getEventDetails(endpoint);
    LOG.info("Returning for endpoint {} eventDetails {}", endpoint, details);
    return details;
  }

  private AtomicBoolean hasEventOccurred(String endpoint) {
    EventDetails details = webhookCallbackResource.getEventDetails(endpoint);
    return new AtomicBoolean(details != null && details.getEvents() != null && details.getEvents().size() <= 0);
  }
}
