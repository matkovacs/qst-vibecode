import { RoutedNavLink } from "@diligentcorp/atlas-react-bundle/global-nav";
import HomeIcon from "@diligentcorp/atlas-react-bundle/icons/Home";
import SettingsIcon from "@diligentcorp/atlas-react-bundle/icons/Settings";

export default function Navigation() {
  return (
    <>
      <RoutedNavLink to="/" label="Home">
        <HomeIcon slot="icon" />
      </RoutedNavLink>
      <RoutedNavLink to="/settings" label="Settings">
        <SettingsIcon slot="icon" />
      </RoutedNavLink>
    </>
  );
}
