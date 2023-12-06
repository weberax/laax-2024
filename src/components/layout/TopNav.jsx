import { Navbar, Container } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { pages } from '../../services/enums';
import Visibility from '../containers/Visibility';
import BackButton from "../buttons/BackButton";
import InstallButton from "../buttons/InstallButton";
import { parentPageOf } from '../../services/parentPage';
import Settings from './Settings';

const TopNav = ({ setShowAboutPage, setShowResetWarning }) => {
  const parentPage = parentPageOf(useLocation().pathname.toString().toLowerCase());

  return <Navbar variant="dark" expand="lg" className="top-navigation">
    <Container fluid>
      <div className="navigation-button-container">
        <Visibility visiblePages={[pages.TRICKDETAILS, pages.COMBODETAILS, pages.POSTTRICK, pages.POSTCOMBO]} elseContent={<InstallButton/>}>
          <BackButton/>
        </Visibility>
      </div>
      <Navbar.Brand href="laax-2024/" className="me-auto">Laax-2024 Tierlist</Navbar.Brand>
      <Settings
        setShowAboutPage={setShowAboutPage}
        setShowResetWarning={setShowResetWarning} />
    </Container>
  </Navbar>;
}

export default TopNav;
