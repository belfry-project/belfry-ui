import { TFunction } from 'i18next';
import { CreateInventory } from '../../inventories/InventoryForm';
import { InventoryHosts } from '../../inventories/InventoryPage/InventoryHosts';
import { Hosts } from '../Hosts';
import {
  appendHostFilterTerm,
  buildFactFilterTerm,
  normalizeFactPath,
  quoteHostFilterValue,
  validateFactValue,
} from './FactFilter';

const t = ((text: string) => text) as unknown as TFunction;

describe('FactFilter helpers', () => {
  it('normalizes fact paths', () => {
    expect(normalizeFactPath('ansible_distribution')).to.equal('ansible_distribution');
    expect(normalizeFactPath(' ansible_python.version.major ')).to.equal(
      'ansible_python__version__major'
    );
    expect(normalizeFactPath('ansible_facts.ansible_lo__ipv4')).to.equal('ansible_lo__ipv4');
    expect(normalizeFactPath('ansible_facts__ansible_kernel')).to.equal('ansible_kernel');
  });

  it('quotes values that need it', () => {
    expect(quoteHostFilterValue('RedHat')).to.equal('RedHat');
    expect(quoteHostFilterValue('Red Hat,CentOS')).to.equal('"Red Hat,CentOS"');
    expect(quoteHostFilterValue('a"b')).to.equal('"a\\"b"');
    expect(quoteHostFilterValue('')).to.equal('""');
  });

  it('builds terms with the fact operators', () => {
    expect(buildFactFilterTerm('ansible_distribution', 'equals', 'RedHat')).to.equal(
      'ansible_facts__ansible_distribution=RedHat'
    );
    expect(buildFactFilterTerm('ansible_distribution_version', 'vgte', '9.2')).to.equal(
      'ansible_facts__ansible_distribution_version__vgte=9.2'
    );
    expect(buildFactFilterTerm('ansible_distribution', 'in', 'RedHat,Rocky')).to.equal(
      'ansible_facts__ansible_distribution__in=RedHat,Rocky'
    );
    expect(buildFactFilterTerm('ansible_python.version_info.0', 'gte', '3')).to.equal(
      'ansible_facts__ansible_python__version_info__0__gte=3'
    );
    expect(buildFactFilterTerm('ansible_local', 'exists', 'false')).to.equal(
      'ansible_facts__ansible_local__exists=false'
    );
  });

  it('combines terms with and', () => {
    expect(appendHostFilterTerm(undefined, 'a=1')).to.equal('a=1');
    expect(appendHostFilterTerm(' ', 'a=1')).to.equal('a=1');
    expect(appendHostFilterTerm('name=web', 'a=1')).to.equal('name=web and a=1');
    expect(appendHostFilterTerm('name=a or name=b', 'x=1')).to.equal('(name=a or name=b) and x=1');
  });

  it('validates values per operator type', () => {
    expect(validateFactValue('number', '8000', t)).to.be.undefined;
    expect(validateFactValue('number', '8k', t)).to.equal('Enter a number.');
    expect(validateFactValue('version', '5.14.0', t)).to.be.undefined;
    expect(validateFactValue('version', '5.14.0-362.el9', t)).to.not.be.undefined;
    expect(validateFactValue('text', 'anything goes', t)).to.be.undefined;
  });
});

describe('Filter by facts in host lists', () => {
  beforeEach(() => {
    // the filters of a list are kept in the URL, which outlives a test
    cy.window().then((win) => {
      const search = new URLSearchParams(win.location.search);
      search.delete('host_filter');
      win.history.replaceState(null, '', `${win.location.pathname}?${search.toString()}`);
    });
    cy.intercept({ method: 'OPTIONS', url: '/api/v2/hosts/' }, { fixture: 'mock_options.json' });
    cy.intercept({ method: 'GET', url: '/api/v2/hosts/*' }, { fixture: 'hosts.json' }).as(
      'hostsList'
    );
    cy.intercept(
      { method: 'GET', url: '/api/v2/inventories/1/hosts/*' },
      { fixture: 'hosts.json' }
    );
    cy.intercept(
      { method: 'GET', url: '/api/v2/inventories/1/*' },
      { fixture: 'inventories.json' }
    );
  });

  it('adds a fact filter to the hosts list and its URL', () => {
    cy.mount(<Hosts />, { path: '/hosts', initialEntries: ['/hosts'] });
    cy.intercept(
      '/api/v2/hosts/?host_filter=ansible_facts__ansible_distribution__in%3DRedHat%2CRocky*'
    ).as('factFilterRequest');
    cy.clickButton(/^Filter by facts$/);
    cy.get('[data-cy="path"]').type('ansible_distribution');
    cy.selectDropdownOptionByResourceName('fact-operator', 'is one of (comma-separated)');
    cy.get('[data-cy="value"]').type('RedHat,Rocky');
    cy.get('[data-cy="fact-filter-preview"]').should(
      'contain.text',
      'ansible_facts__ansible_distribution__in=RedHat,Rocky'
    );
    cy.clickButton(/^Apply$/);
    cy.wait('@factFilterRequest');
    cy.contains('.pf-v5-c-chip', 'ansible_facts__ansible_distribution__in=RedHat,Rocky').should(
      'have.length',
      1
    );
    cy.location('search').should(
      'contain',
      'host_filter=ansible_facts__ansible_distribution__in%3DRedHat%2CRocky'
    );

    // a second condition is combined with "and"
    cy.intercept(
      '/api/v2/hosts/?host_filter=ansible_facts__ansible_distribution__in%3DRedHat%2CRocky%20and%20ansible_facts__ansible_memtotal_mb__gt%3D8000*'
    ).as('secondFilterRequest');
    cy.clickButton(/^Filter by facts$/);
    cy.get('[data-cy="path"]').type('ansible_memtotal_mb');
    cy.selectDropdownOptionByResourceName('fact-operator', '> (number)');
    cy.get('[data-cy="value"]').type('lots');
    cy.clickButton(/^Apply$/);
    cy.contains('Enter a number.').should('be.visible');
    cy.get('[data-cy="value"]').clear().type('8000');
    cy.clickButton(/^Apply$/);
    cy.wait('@secondFilterRequest');
    cy.get('[data-cy="smart-inventory"]').should('not.have.attr', 'aria-disabled', 'true');
  });

  it('reads a host filter with commas from the URL as one filter', () => {
    cy.window().then((win) => {
      const search = win.location.search.replace(/^\?/, '');
      win.history.replaceState(
        null,
        '',
        `${win.location.pathname}?host_filter=${encodeURIComponent(
          'ansible_facts__ansible_distribution__in=RedHat,Rocky'
        )}&${search}`
      );
    });
    cy.intercept(
      '/api/v2/hosts/?host_filter=ansible_facts__ansible_distribution__in%3DRedHat%2CRocky*'
    ).as('factFilterRequest');
    cy.mount(<Hosts />, { path: '/hosts', initialEntries: ['/hosts'] });
    cy.wait('@factFilterRequest');
  });

  it('offers the fact filter in the hosts of an inventory', () => {
    cy.mount(<InventoryHosts />, {
      path: '/inventories/:inventory_type/:id/hosts',
      initialEntries: ['/inventories/inventory/1/hosts'],
    });
    cy.intercept(
      '/api/v2/inventories/1/hosts/?host_filter=ansible_facts__ansible_os_family%3D%22Red%20Hat%22*'
    ).as('factFilterRequest');
    cy.clickButton(/^Filter by facts$/);
    cy.get('[data-cy="path"]').type('ansible_os_family');
    cy.get('[data-cy="value"]').type('Red Hat');
    cy.clickButton(/^Apply$/);
    cy.wait('@factFilterRequest');
  });
});

describe('Fact conditions in the smart inventory form', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', url: '/api/v2/organizations/*' },
      { fixture: 'organizations.json' }
    );
  });

  it('adds fact conditions to the smart host filter', () => {
    cy.mount(<CreateInventory inventoryKind="smart" />);
    cy.get('[data-cy="host-filter"]').type('name__icontains=web');
    cy.get('[data-cy="add-fact-filter"]').click();
    cy.get('[data-cy="path"]').type('ansible_distribution_version');
    cy.selectDropdownOptionByResourceName('fact-operator', '>= (version)');
    cy.get('[data-cy="value"]').type('9.2');
    cy.clickButton(/^Apply$/);
    cy.get('[data-cy="host-filter"]').should(
      'have.value',
      'name__icontains=web and ansible_facts__ansible_distribution_version__vgte=9.2'
    );
  });
});
