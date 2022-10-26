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

package org.openmetadata.service.security;

import static org.openmetadata.schema.entity.teams.AuthenticationMechanism.AuthType.JWT;
import static org.openmetadata.schema.entity.teams.AuthenticationMechanism.AuthType.SSO;
import static org.openmetadata.schema.teams.authn.SSOAuthMechanism.SsoServiceType.AUTH_0;
import static org.openmetadata.schema.teams.authn.SSOAuthMechanism.SsoServiceType.AZURE;
import static org.openmetadata.schema.teams.authn.SSOAuthMechanism.SsoServiceType.CUSTOM_OIDC;
import static org.openmetadata.schema.teams.authn.SSOAuthMechanism.SsoServiceType.GOOGLE;
import static org.openmetadata.schema.teams.authn.SSOAuthMechanism.SsoServiceType.OKTA;
import static org.openmetadata.service.Entity.ADMIN_USER_NAME;
import static org.openmetadata.service.exception.CatalogExceptionMessage.notAdmin;
import static org.openmetadata.service.resources.teams.UserResource.USER_PROTECTED_FIELDS;

import at.favre.lib.crypto.bcrypt.BCrypt;
import java.io.IOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.ws.rs.core.SecurityContext;
import lombok.extern.slf4j.Slf4j;
import org.jdbi.v3.core.Jdbi;
import org.openmetadata.schema.api.configuration.airflow.AirflowConfiguration;
import org.openmetadata.schema.api.security.AuthenticationConfiguration;
import org.openmetadata.schema.email.SmtpSettings;
import org.openmetadata.schema.entity.teams.AuthenticationMechanism;
import org.openmetadata.schema.entity.teams.User;
import org.openmetadata.schema.security.client.OpenMetadataJWTClientConfig;
import org.openmetadata.schema.teams.authn.BasicAuthMechanism;
import org.openmetadata.schema.teams.authn.JWTAuthMechanism;
import org.openmetadata.schema.teams.authn.JWTTokenExpiry;
import org.openmetadata.schema.teams.authn.SSOAuthMechanism;
import org.openmetadata.schema.type.Permission.Access;
import org.openmetadata.schema.type.ResourcePermission;
import org.openmetadata.service.Entity;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.exception.EntityNotFoundException;
import org.openmetadata.service.jdbi3.EntityRepository;
import org.openmetadata.service.jdbi3.UserRepository;
import org.openmetadata.service.secrets.SecretsManager;
import org.openmetadata.service.secrets.SecretsManagerFactory;
import org.openmetadata.service.security.jwt.JWTTokenGenerator;
import org.openmetadata.service.security.policyevaluator.OperationContext;
import org.openmetadata.service.security.policyevaluator.PolicyCache;
import org.openmetadata.service.security.policyevaluator.PolicyEvaluator;
import org.openmetadata.service.security.policyevaluator.ResourceContextInterface;
import org.openmetadata.service.security.policyevaluator.RoleCache;
import org.openmetadata.service.security.policyevaluator.SubjectCache;
import org.openmetadata.service.security.policyevaluator.SubjectContext;
import org.openmetadata.service.util.EmailUtil;
import org.openmetadata.service.util.EntityUtil;
import org.openmetadata.service.util.PasswordUtil;
import org.openmetadata.service.util.RestUtil;

@Slf4j
public class DefaultAuthorizer implements Authorizer {
  private static final String COLON_DELIMITER = ":";
  private boolean isSmtpEnabled;

  @Override
  public void init(OpenMetadataApplicationConfig config, Jdbi dbi) {
    LOG.info("Initializing DefaultAuthorizer with config {}", config.getAuthorizerConfiguration());
    SmtpSettings smtpSettings = config.getSmtpSettings();
    this.isSmtpEnabled = smtpSettings != null && smtpSettings.getEnableSmtpServer();
    SubjectCache.initialize();
    PolicyCache.initialize();
    RoleCache.initialize();
    initializeUsers(config);
  }

  private void initializeUsers(OpenMetadataApplicationConfig config) {
    Set<String> adminUsers = new HashSet<>(config.getAuthorizerConfiguration().getAdminPrincipals());
    LOG.debug("Checking user entries for admin users {}", adminUsers);
    String domain = SecurityUtil.getDomain(config);
    String providerType = config.getAuthenticationConfiguration().getProvider();
    if (providerType.equals(SSOAuthMechanism.SsoServiceType.BASIC.value())) {
      handleBasicAuth(adminUsers, domain);
    } else {
      addUsers(adminUsers, domain, true);
    }

    LOG.debug("Checking user entries for test users");
    Set<String> testUsers = new HashSet<>(config.getAuthorizerConfiguration().getTestPrincipals());
    addUsers(testUsers, domain, null);
  }

  private void handleBasicAuth(Set<String> adminUsers, String domain) {
    try {
      for (String adminUser : adminUsers) {
        if (adminUser.contains(COLON_DELIMITER)) {
          String[] tokens = adminUser.split(COLON_DELIMITER);
          addUserForBasicAuth(tokens[0], tokens[1], domain);
        } else {
          boolean isDefaultAdmin = adminUser.equals(ADMIN_USER_NAME);
          String token = PasswordUtil.generateRandomPassword();
          if (isDefaultAdmin || !isSmtpEnabled) {
            token = ADMIN_USER_NAME;
          }
          addUserForBasicAuth(adminUser, token, domain);
        }
      }
    } catch (IOException e) {
      LOG.error("Failed in Basic Auth Setup. Reason : {}", e.getMessage());
    }
  }

  private void addUserForBasicAuth(String username, String pwd, String domain) throws IOException {
    EntityRepository<User> userRepository = Entity.getEntityRepository(Entity.USER);
    User originalUser;
    try {
      List<String> fields = userRepository.getAllowedFieldsCopy();
      fields.add(USER_PROTECTED_FIELDS);
      originalUser = userRepository.getByName(null, username, new EntityUtil.Fields(fields, String.join(",", fields)));
      if (originalUser.getAuthenticationMechanism() == null) {
        updateUserWithHashedPwd(originalUser, pwd);
      }
      addOrUpdateUser(originalUser);
    } catch (EntityNotFoundException e) {
      // TODO: Not the best way ! :(
      User user = user(username, domain, username).withIsAdmin(true).withIsEmailVerified(true);
      updateUserWithHashedPwd(user, pwd);
      addOrUpdateUser(user);
      if (isSmtpEnabled) {
        sendInviteMailToAdmin(user, pwd);
      }
    }
  }

  private void sendInviteMailToAdmin(User user, String pwd) {
    Map<String, String> templatePopulator = new HashMap<>();
    templatePopulator.put(EmailUtil.ENTITY, EmailUtil.getInstance().getEmailingEntity());
    templatePopulator.put(EmailUtil.SUPPORT_URL, EmailUtil.getInstance().getSupportUrl());
    templatePopulator.put(EmailUtil.USERNAME, user.getName());
    templatePopulator.put(EmailUtil.PASSWORD, pwd);
    templatePopulator.put(EmailUtil.APPLICATION_LOGIN_LINK, EmailUtil.getInstance().getOMUrl());
    try {
      EmailUtil.getInstance()
          .sendMail(
              EmailUtil.getInstance().getEmailInviteSubject(),
              templatePopulator,
              user.getEmail(),
              EmailUtil.EMAIL_TEMPLATE_BASEPATH,
              EmailUtil.INVITE_RANDOM_PWD);
    } catch (Exception ex) {
      LOG.error("Failed in sending Mail to user [{}]. Reason : {}", user.getEmail(), ex.getMessage());
    }
  }

  private void updateUserWithHashedPwd(User user, String pwd) {
    String hashedPwd = BCrypt.withDefaults().hashToString(12, pwd.toCharArray());
    user.setAuthenticationMechanism(
        new AuthenticationMechanism()
            .withAuthType(AuthenticationMechanism.AuthType.BASIC)
            .withConfig(new BasicAuthMechanism().withPassword(hashedPwd)));
  }

  public static User user(String name, String domain, String updatedBy) {
    return new User()
        .withId(UUID.randomUUID())
        .withName(name)
        .withFullyQualifiedName(name)
        .withEmail(name + "@" + domain)
        .withUpdatedBy(updatedBy)
        .withUpdatedAt(System.currentTimeMillis())
        .withIsBot(false);
  }

  @Override
  public List<ResourcePermission> listPermissions(SecurityContext securityContext, String user) {
    SubjectContext subjectContext = getSubjectContext(securityContext);
    subjectContext = changeSubjectContext(user, subjectContext);

    if (subjectContext.isAdmin() || subjectContext.isBot()) {
      // Admins and bots have permissions to do all operations.
      return PolicyEvaluator.getResourcePermissions(Access.ALLOW);
    }
    return PolicyEvaluator.listPermission(subjectContext);
  }

  @Override
  public ResourcePermission getPermission(SecurityContext securityContext, String user, String resourceType) {
    SubjectContext subjectContext = getSubjectContext(securityContext);
    subjectContext = changeSubjectContext(user, subjectContext);

    if (subjectContext.isAdmin() || subjectContext.isBot()) {
      // Admins and bots have permissions to do all operations.
      return PolicyEvaluator.getResourcePermission(resourceType, Access.ALLOW);
    }
    return PolicyEvaluator.getPermission(subjectContext, resourceType);
  }

  @Override
  public ResourcePermission getPermission(
      SecurityContext securityContext, String user, ResourceContextInterface resourceContext) {
    SubjectContext subjectContext = getSubjectContext(securityContext);
    subjectContext = changeSubjectContext(user, subjectContext);

    if (subjectContext.isAdmin() || subjectContext.isBot()) {
      // Admins and bots have permissions to do all operations.
      return PolicyEvaluator.getResourcePermission(resourceContext.getResource(), Access.ALLOW);
    }
    return PolicyEvaluator.getPermission(subjectContext, resourceContext);
  }

  @Override
  public void authorize(
      SecurityContext securityContext, OperationContext operationContext, ResourceContextInterface resourceContext)
      throws IOException {
    SubjectContext subjectContext = getSubjectContext(securityContext);
    if (subjectContext.isAdmin()) {
      return;
    }
    PolicyEvaluator.hasPermission(subjectContext, resourceContext, operationContext);
  }

  @Override
  public void authorizeAdmin(SecurityContext securityContext, boolean allowBots) {
    SubjectContext subjectContext = getSubjectContext(securityContext);
    if (subjectContext.isAdmin() || (allowBots && subjectContext.isBot())) {
      return;
    }
    throw new AuthorizationException(notAdmin(securityContext.getUserPrincipal().getName()));
  }

  private void addUsers(Set<String> users, String domain, Boolean isAdmin) {
    for (String userName : users) {
      User user = user(userName, domain, userName).withIsAdmin(isAdmin);
      addOrUpdateUser(user);
    }
  }

  private static User addOrUpdateUser(User user) {
    EntityRepository<User> userRepository = Entity.getEntityRepository(Entity.USER);
    try {
      RestUtil.PutResponse<User> addedUser = userRepository.createOrUpdate(null, user);
      // should not log the user auth details in LOGS
      LOG.debug("Added user entry: {}", addedUser.getEntity().getName());
      return addedUser.getEntity();
    } catch (Exception exception) {
      // In HA set up the other server may have already added the user.
      LOG.debug("Caught exception", exception);
      user.setAuthenticationMechanism(null);
      LOG.debug("User entry: {} already exists.", user.getName());
    }
    return null;
  }

  /**
   * This method add auth mechanism in the following way:
   *
   * <ul>
   *   <li>If original user has already an authMechanism, add it to the user
   *   <li>Otherwise:
   *       <ul>
   *         <li>If airflow configuration is 'openmetadata' and server auth provider is not basic, add JWT auth
   *             mechanism from Airflow configuration
   *         <li>Otherwise:
   *             <ul>
   *               <li>If airflow configuration is 'basic', add JWT auth mechanism with a generated token which does not
   *                   expire
   *               <li>Otherwise, add SSO auth mechanism from Airflow configuration
   *             </ul>
   *       </ul>
   * </ul>
   */
  public static User addOrUpdateBotUser(User user, OpenMetadataApplicationConfig openMetadataApplicationConfig) {
    User originalUser = retrieveAuthMechanism(user);
    // the user did not have an auth mechanism
    AuthenticationMechanism authMechanism = originalUser != null ? originalUser.getAuthenticationMechanism() : null;
    if (authMechanism == null) {
      AuthenticationConfiguration authConfig = openMetadataApplicationConfig.getAuthenticationConfiguration();
      AirflowConfiguration airflowConfig = openMetadataApplicationConfig.getAirflowConfiguration();
      // if the auth provider is "openmetadata" in the configuration set JWT as auth mechanism
      if ("openmetadata".equals(airflowConfig.getAuthProvider()) && !"basic".equals(authConfig.getProvider())) {
        OpenMetadataJWTClientConfig jwtClientConfig = airflowConfig.getAuthConfig().getOpenmetadata();
        authMechanism =
            buildAuthMechanism(
                JWT,
                new JWTAuthMechanism()
                    .withJWTToken(jwtClientConfig.getJwtToken())
                    .withJWTTokenExpiry(JWTTokenExpiry.Unlimited));
      } else {
        // Otherwise, set auth mechanism from airflow configuration
        // TODO: https://github.com/open-metadata/OpenMetadata/issues/7712
        if (airflowConfig.getAuthConfig() != null && !"basic".equals(authConfig.getProvider())) {
          switch (authConfig.getProvider()) {
            case "no-auth":
              break;
            case "azure":
              authMechanism =
                  buildAuthMechanism(SSO, buildAuthMechanismConfig(AZURE, airflowConfig.getAuthConfig().getAzure()));
              break;
            case "google":
              authMechanism =
                  buildAuthMechanism(SSO, buildAuthMechanismConfig(GOOGLE, airflowConfig.getAuthConfig().getGoogle()));
              break;
            case "okta":
              authMechanism =
                  buildAuthMechanism(SSO, buildAuthMechanismConfig(OKTA, airflowConfig.getAuthConfig().getOkta()));
              break;
            case "auth0":
              authMechanism =
                  buildAuthMechanism(SSO, buildAuthMechanismConfig(AUTH_0, airflowConfig.getAuthConfig().getAuth0()));
              break;
            case "custom-oidc":
              authMechanism =
                  buildAuthMechanism(
                      SSO, buildAuthMechanismConfig(CUSTOM_OIDC, airflowConfig.getAuthConfig().getCustomOidc()));
              break;
            default:
              throw new IllegalArgumentException(
                  String.format(
                      "Unexpected auth provider [%s] for bot [%s]", authConfig.getProvider(), user.getName()));
          }
        } else if ("basic".equals(authConfig.getProvider())) {
          authMechanism =
              buildAuthMechanism(JWT, JWTTokenGenerator.getInstance().generateJWTToken(user, JWTTokenExpiry.Unlimited));
        }
      }
    }
    user.setAuthenticationMechanism(authMechanism);
    user.setDescription(user.getDescription());
    user.setDisplayName(user.getDisplayName());
    return addOrUpdateUser(user);
  }

  private static SSOAuthMechanism buildAuthMechanismConfig(
      SSOAuthMechanism.SsoServiceType ssoServiceType, Object config) {
    return new SSOAuthMechanism().withSsoServiceType(ssoServiceType).withAuthConfig(config);
  }

  private static AuthenticationMechanism buildAuthMechanism(AuthenticationMechanism.AuthType authType, Object config) {
    return new AuthenticationMechanism().withAuthType(authType).withConfig(config);
  }

  private static User retrieveAuthMechanism(User user) {
    EntityRepository<User> userRepository = UserRepository.class.cast(Entity.getEntityRepository(Entity.USER));
    try {
      User originalUser =
          userRepository.getByName(null, user.getName(), new EntityUtil.Fields(List.of("authenticationMechanism")));
      AuthenticationMechanism authMechanism = originalUser.getAuthenticationMechanism();
      SecretsManager secretsManager = SecretsManagerFactory.getSecretsManager();
      if (authMechanism != null) {
        Object config =
            secretsManager.encryptOrDecryptBotUserCredentials(user.getName(), authMechanism.getConfig(), false);
        authMechanism.setConfig(config != null ? config : authMechanism.getConfig());
      }
      return originalUser;
    } catch (IOException | EntityNotFoundException e) {
      LOG.debug("Bot entity: {} does not exists.", user);
      return null;
    }
  }

  public static SubjectContext getSubjectContext(SecurityContext securityContext) {
    if (securityContext == null || securityContext.getUserPrincipal() == null) {
      throw new AuthenticationException("No principal in security context");
    }
    return getSubjectContext(SecurityUtil.getUserName(securityContext.getUserPrincipal()));
  }

  public static SubjectContext getSubjectContext(String userName) {
    return SubjectCache.getInstance().getSubjectContext(userName);
  }

  private SubjectContext changeSubjectContext(String user, SubjectContext loggedInUser) {
    // Asking for some other user's permissions is admin only operation
    if (user != null && !loggedInUser.getUser().getName().equals(user)) {
      if (!loggedInUser.isAdmin()) {
        throw new AuthorizationException(notAdmin(loggedInUser.getUser().getName()));
      }
      LOG.debug("Changing subject context from logged-in user to {}", user);
      return getSubjectContext(user);
    }
    return loggedInUser;
  }
}
