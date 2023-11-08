import { BsDownload } from 'react-icons/bs';
import { useReactPWAInstall } from 'react-pwa-install';
import logo from '../../../public/logo96.png';

const InstallButton = () => {
  const { pwaInstall, supported, isInstalled } = useReactPWAInstall();

  const installApp = () => {
    pwaInstall({
      title: "Laax-2024 Tricklist",
      logo: logo,
      features: (
        <ul>
          <li>Tricklist</li>
          <li>Combolist</li>
          <li>Random combo generator</li>
          <li>Works offline</li>
        </ul>
      ),
      description: "Tricklist for the worldchampionship Laax 2024",
    })
      .catch((e) => {
        console.warn(e)
      });
  };

  return (
    <>
      {supported() && !isInstalled() && (
        <button className="btn btn-link" onClick={installApp}>
          <BsDownload className="icon-white" />
        </button>
      )}
    </>
  );
}

export default InstallButton;
