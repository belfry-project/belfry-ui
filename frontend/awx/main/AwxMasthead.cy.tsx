import { AwxMasthead } from './AwxMasthead';

describe('AwxMasthead', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', url: '/api/v2/workflow_approvals/*' },
      { count: 0, next: null, previous: null, results: [] }
    );
  });

  it('links to the API explorer in the help menu', () => {
    cy.mount(<AwxMasthead />);
    cy.get('#help-menu button').first().click();
    cy.get('[data-cy="masthead-documentation"]').should('be.visible');
    cy.get('[data-cy="masthead-api-explorer"]')
      .should('be.visible')
      .and('contain.text', 'API explorer')
      .and('have.attr', 'href', '/api/v2/docs/')
      .and('have.attr', 'target', '_blank');
  });
});
