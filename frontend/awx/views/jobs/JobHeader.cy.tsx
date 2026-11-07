import { JobHeader } from './JobHeader';

describe('Job Page', () => {
  beforeEach(() => {
    cy.intercept(
      {
        method: 'GET',
        url: '/api/v2/workflow_jobs/*',
      },
      {
        fixture: 'running_job.json',
      }
    );
  });
  it('Relaunch and cancel buttons are visible on a running job', () => {
    cy.mount(<JobHeader />, { path: ':job_type/:id', initialEntries: ['/workflow/1'] });
    cy.get('[data-cy="relaunch-job"]').should('contain', 'Relaunch job');
    cy.get('[data-cy="cancel-job"]').should('contain', 'Cancel job');
  });
  it('Delete button is disabled on a running job', () => {
    cy.mount(<JobHeader />, { path: ':job_type/:id', initialEntries: ['/workflow/1'] });
    cy.getByDataCy('actions-dropdown').click();
    cy.contains('#delete-job', /^Delete job$/).should('have.attr', 'aria-disabled', 'true');
  });
  it('Delete button is enabled on a finished job', () => {
    cy.intercept(
      {
        method: 'GET',
        url: '/api/v2/workflow_jobs/*',
      },
      {
        fixture: 'workflow_job.json',
      }
    );
    cy.mount(<JobHeader />, { path: ':job_type/:id', initialEntries: ['/workflow/1'] });
    cy.getByDataCy('actions-dropdown').click();
    cy.contains('#delete-job', /^Delete job$/).should('not.have.attr', 'aria-disabled', 'true');
  });
  it('Cancel button is disabled on a finished job', () => {
    cy.intercept(
      {
        method: 'GET',
        url: '/api/v2/workflow_jobs/*',
      },
      {
        fixture: 'workflow_job.json',
      }
    );
    cy.mount(<JobHeader />, { path: ':job_type/:id', initialEntries: ['/workflow/1'] });
    cy.getByDataCy('actions-dropdown').click();
    cy.contains('[data-cy="cancel-job"]', 'Cancel job').should(
      'have.attr',
      'aria-disabled',
      'true'
    );
  });

  describe('Save as job template', () => {
    it('is not offered for a job launched from a job template', () => {
      cy.intercept({ method: 'GET', url: '/api/v2/jobs/*' }, { fixture: 'job.json' });
      cy.mount(<JobHeader />, { path: ':job_type/:id', initialEntries: ['/playbook/26'] });
      cy.getByDataCy('actions-dropdown').click();
      cy.contains('#delete-job', /^Delete job$/).should('exist');
      cy.contains('Save as job template').should('not.exist');
    });
    it('creates a job template from a job that ran a playbook directly', () => {
      cy.fixture('job.json').then((job: { related: object }) => {
        cy.intercept(
          { method: 'GET', url: '/api/v2/jobs/*' },
          {
            ...job,
            job_template: null,
            related: {
              ...job.related,
              create_job_template: '/api/v2/jobs/26/create_job_template/',
            },
          }
        );
      });
      cy.intercept(
        { method: 'POST', url: '/api/v2/jobs/26/create_job_template/' },
        { statusCode: 201, body: { id: 42, name: 'Saved run', type: 'job_template' } }
      ).as('createJobTemplate');
      cy.mount(<JobHeader />, { path: ':job_type/:id', initialEntries: ['/playbook/26'] });
      cy.getByDataCy('actions-dropdown').click();
      cy.contains('Save as job template').click();
      cy.get('[data-cy="name"]')
        .should('have.value', 'Demo Job Template')
        .clear()
        .type('Saved run');
      cy.get('[data-cy="description"]').type('From a direct run');
      cy.clickButton(/^Save$/);
      cy.wait('@createJobTemplate')
        .its('request.body')
        .should('deep.equal', { name: 'Saved run', description: 'From a direct run' });
    });
  });
});
