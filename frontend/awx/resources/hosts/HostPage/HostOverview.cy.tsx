import { filterFacts, HostOverview, HostOverviewData } from './HostOverview';

const overview: HostOverviewData = {
  host: {
    id: 12,
    name: 'web1',
    description: '',
    enabled: true,
    inventory: { id: 3, name: 'Prod', kind: '' },
  },
  variables: { ansible_host: '10.0.0.1', http_port: 8080 },
  groups: {
    direct: [{ id: 5, name: 'web' }],
    all: [
      { id: 4, name: 'prod' },
      { id: 5, name: 'web' },
    ],
  },
  facts: {
    ansible_distribution: 'RedHat',
    ansible_distribution_version: '9.4',
    ansible_memtotal_mb: 7680,
    ansible_python: { version: { major: 3, minor: 9 } },
  },
  ansible_facts_modified: '2026-11-07T10:00:00Z',
  last_job_per_template: [
    {
      job_template: { id: 7, name: 'Deploy web' },
      job: {
        id: 101,
        name: 'Deploy web',
        status: 'failed',
        finished: '2026-11-07T11:00:00Z',
        failed: true,
      },
      host_failed: false,
    },
  ],
  recent_jobs: [
    {
      id: 101,
      type: 'job',
      name: 'Deploy web',
      status: 'failed',
      created: '2026-11-07T10:58:00Z',
      started: '2026-11-07T10:59:00Z',
      finished: '2026-11-07T11:00:00Z',
      failed: true,
    },
    {
      id: 55,
      type: 'ad_hoc_command',
      name: 'ping',
      status: 'successful',
      created: '2026-11-06T10:58:00Z',
      started: '2026-11-06T10:59:00Z',
      finished: '2026-11-06T11:00:00Z',
      failed: false,
    },
  ],
};

describe('HostOverview', () => {
  it('shows facts, groups, variables and jobs of the host', () => {
    cy.intercept({ method: 'GET', url: '/api/v2/hosts/12/overview/*' }, overview).as('overview');
    cy.mount(<HostOverview />, {
      path: '/hosts/:id/overview',
      initialEntries: ['/hosts/12/overview'],
    });
    cy.wait('@overview').its('request.url').should('include', 'jobs=10');

    // facts: searchable, nested values collapsed
    cy.get('[data-cy="host-facts-table"] tbody tr').should('have.length', 4);
    cy.get('[data-cy="fact-ansible_distribution"]').should('contain.text', 'RedHat');
    cy.get('[data-cy="fact-ansible_python"]').should('contain.text', 'Dictionary (1)');
    cy.get('[data-cy="fact-ansible_python"] pre').should('not.be.visible');
    cy.get('[data-cy="fact-ansible_python"]').contains('button', 'Dictionary (1)').click();
    cy.get('[data-cy="fact-ansible_python"] pre')
      .should('be.visible')
      .and('contain.text', '"major": 3');
    cy.get('[data-cy="host-facts-search"] input').type('distribution');
    cy.get('[data-cy="host-facts-table"] tbody tr').should('have.length', 2);
    cy.get('[data-cy="host-facts-search"] input').clear().type('redhat');
    cy.get('[data-cy="host-facts-table"] tbody tr').should('have.length', 1);

    // groups: direct and all, linked to the group of the inventory
    // (the component tests have no route tree, so links are checked by their text)
    cy.get('[data-cy="host-groups"]').should('contain.text', 'web');
    cy.get('[data-cy="host-groups"]').should('not.contain.text', 'prod');
    cy.get('#host-groups-all').click();
    cy.get('[data-cy="host-groups"]').should('contain.text', 'prod');
    cy.get('[data-cy="host-groups"]').contains('a', 'prod').should('exist');

    // variables
    cy.get('#host-overview-variables').should('contain.text', 'http_port');

    // last result per job template: the job failed, but not on this host
    cy.get('#host-overview-last-job-per-template').within(() => {
      cy.contains('a', 'Deploy web').should('exist');
      cy.contains('OK').should('exist');
      cy.contains('a', '101 - Deploy web').should('exist');
    });

    // recent jobs link to their output
    cy.get('#host-overview-recent-jobs').within(() => {
      cy.contains('a', '101 - Deploy web').should('exist');
      cy.contains('a', '55 - ping').should('exist');
    });
  });

  it('uses the host of the inventory routes and handles a host without facts or jobs', () => {
    cy.intercept(
      { method: 'GET', url: '/api/v2/hosts/12/overview/*' },
      {
        ...overview,
        facts: {},
        ansible_facts_modified: null,
        groups: { direct: [], all: [] },
        last_job_per_template: [],
        recent_jobs: [],
      }
    ).as('overview');
    cy.mount(<HostOverview />, {
      path: '/inventories/:inventory_type/:id/hosts/:host_id/overview',
      initialEntries: ['/inventories/inventory/3/hosts/12/overview'],
    });
    cy.wait('@overview');
    cy.contains('No facts have been gathered for this host.').should('be.visible');
    cy.contains('This host is not in any group.').should('be.visible');
    cy.contains('No job template has run on this host yet.').should('be.visible');
    cy.contains('No jobs have run on this host yet.').should('be.visible');
  });

  it('filters facts by key and value', () => {
    const facts = { a_key: 'x', other: 'needle', nested: { deep: 'Needle' } };
    expect(filterFacts(facts, '').map(([key]) => key)).to.deep.equal(['a_key', 'nested', 'other']);
    expect(filterFacts(facts, 'NEEDLE').map(([key]) => key)).to.deep.equal(['nested', 'other']);
    expect(filterFacts(facts, 'a_k').map(([key]) => key)).to.deep.equal(['a_key']);
    expect(filterFacts(null, 'x')).to.deep.equal([]);
  });
});
