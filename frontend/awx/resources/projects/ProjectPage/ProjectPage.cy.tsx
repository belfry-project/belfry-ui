import { ProjectPage } from './ProjectPage';

describe('ProjectPage', () => {
  beforeEach(() => {
    cy.intercept({ method: 'GET', url: '/api/v2/projects/9/' }, { fixture: 'project.json' });
  });

  it('asks for notification admin organizations with a permission the API accepts', () => {
    // The API rejects the old role name (role_level=notification_admin_role) with 400
    cy.intercept(
      { method: 'GET', url: '/api/v2/organizations/?role_level=add_notificationtemplate*' },
      { count: 1, next: null, previous: null, results: [{ id: 1, name: 'Default' }] }
    ).as('notificationAdminOrgs');
    cy.mount(<ProjectPage />, {
      path: '/projects/:id/*',
      initialEntries: ['/projects/9/details'],
    });
    cy.wait('@notificationAdminOrgs');
    cy.verifyPageTitle('Demo Project @ 10:44:51');
    cy.contains('[role="tab"], a, button', 'Notifications').should('exist');
  });

  it('hides the notifications tab for users who are not notification admins', () => {
    cy.intercept(
      { method: 'GET', url: '/api/v2/organizations/?role_level=add_notificationtemplate*' },
      { count: 0, next: null, previous: null, results: [] }
    ).as('notificationAdminOrgs');
    cy.mount(<ProjectPage />, {
      path: '/projects/:id/*',
      initialEntries: ['/projects/9/details'],
    });
    cy.wait('@notificationAdminOrgs');
    cy.verifyPageTitle('Demo Project @ 10:44:51');
    cy.contains('Job Templates').should('exist');
    cy.contains('Notifications').should('not.exist');
  });
});
