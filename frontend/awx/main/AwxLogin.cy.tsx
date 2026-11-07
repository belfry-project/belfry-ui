import { AwxActiveUserContext } from '../common/useAwxActiveUser';
import { AwxLogin } from './AwxLogin';

describe('AwxLogin', () => {
  it('shows the login form without requesting social auth methods', () => {
    cy.intercept('GET', '/api/v2/auth/', cy.spy().as('authOptions'));
    cy.mount(
      <AwxActiveUserContext.Provider value={{ activeAwxUser: null }}>
        <AwxLogin>
          <div id="logged-in" />
        </AwxLogin>
      </AwxActiveUserContext.Provider>
    );
    cy.get('#pf-login-username-id').should('be.visible');
    cy.get('#logged-in').should('not.exist');
    cy.get('@authOptions').should('not.have.been.called');
  });
});
