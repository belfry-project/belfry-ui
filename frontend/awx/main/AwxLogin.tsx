import { Page } from '@patternfly/react-core';
import { mutate } from 'swr';
import { LoadingState } from '../../../framework/components/LoadingState';
import BelfryBrand from '../../assets/belfry-logo.svg';
import { AnsibleLogin } from '../../common/AnsibleLogin/AnsibleLogin';
import { useAwxActiveUser } from '../common/useAwxActiveUser';
import { AwxConfigProvider } from '../common/useAwxConfig';
import { WebSocketProvider } from '../common/useAwxWebSocket';
import { DocsVersionProvider } from '../common/useDocsVersion';

export function AwxLogin(props: { children: React.ReactNode }) {
  // Belfry (like AWX since social auth moved out) has no /api/v2/auth/ endpoint listing
  // social login methods: only username/password login exists, so do not probe for them.
  const { activeAwxUser, refreshActiveAwxUser } = useAwxActiveUser();

  if (activeAwxUser === undefined) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }

  if (!activeAwxUser) {
    return (
      <AnsibleLogin
        loginApiUrl="/api/login/"
        onSuccess={() => {
          refreshActiveAwxUser?.();
          void mutate(() => true);
        }}
        brandImg={<BelfryBrand style={{ height: 64 }} aria-label={process.env.PRODUCT} />}
        brandImgAlt={process.env.PRODUCT}
      />
    );
  }

  return (
    <DocsVersionProvider version={undefined}>
      <WebSocketProvider>
        <AwxConfigProvider>{props.children}</AwxConfigProvider>
      </WebSocketProvider>
    </DocsVersionProvider>
  );
}
