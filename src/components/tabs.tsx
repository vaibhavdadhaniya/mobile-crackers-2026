import { ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { AppHeader } from './AppHeader';
import { TabBar } from './TabBar';
import { InTabsContext } from './ui';
import { colors } from '../theme';

// Options for one tab: label + gradient header. Pass `header: false` for screens that draw their own hero.
export const tab = (title: string, headerTitle?: string, subtitle?: string, header = true) => ({
  title,
  headerShown: header,
  header: () => <AppHeader title={headerTitle ?? title} subtitle={subtitle} />,
});

export function AppTabs({ children }: { children: ReactNode }) {
  return (
    <InTabsContext.Provider value={true}>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ sceneStyle: { backgroundColor: colors.surface } }}>
        {children}
      </Tabs>
    </InTabsContext.Provider>
  );
}

export const statusTone = { pending: 'warning', approved: 'success', accepted: 'success', rejected: 'danger', cancelled: 'neutral' } as const;
