import Modal from 'react-bootstrap/Modal';

const About = ({ showAboutPage, setShowAboutPage }) => {
  return (
    <Modal show={showAboutPage} onHide={() => setShowAboutPage(false)} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>About weberax.github.io/laax-2024</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>This is the official tierlist for the worldchampionship in Laax 2024.</p>
        <p>More details and infos at <a target="_blank" href="http://www.swiss-slackline.ch/laax">www.swiss-slackline.ch/laax</a>.</p>
      </Modal.Body>
    </Modal>
  );
}
 
export default About;
