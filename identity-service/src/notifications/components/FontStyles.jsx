const React = require('react')

const FontStyles = () => {
  return (
    <style type='text/css' dangerouslySetInnerHTML={{ __html: `
    @font-face {
      font-family: 'Avenir Next LT Pro';
      font-style: normal;
      font-weight: 100;
      src: url(https://download.coliving.lol/fonts/AvenirNextLTPro-UltLt.ttf) format("truetype"), url(https://download.coliving.lol/fonts/AvenirNextLTPro-UltLt.otf) format("opentype");
    }

    @font-face {
      font-family: 'Avenir Next LT Pro';
      font-style: normal;
      font-weight: 400;
      src: url(https://download.coliving.lol/fonts/AvenirNextLTPro-Regular.ttf) format("truetype"), url(https://download.coliving.lol/fonts/AvenirNextLTPro-Regular.otf) format("opentype");
    }

    @font-face {
      font-family: 'Avenir Next LT Pro';
      font-style: normal;
      font-weight: 500;
      src: url(https://download.coliving.lol/fonts/AvenirNextLTPro-Medium.ttf) format("truetype"), url(https://download.coliving.lol/fonts/AvenirNextLTPro-Medium.otf) format("opentype");
    }

    @font-face {
      font-family: 'Avenir Next LT Pro';
      font-style: normal;
      font-weight: 600;
      src: url(https://download.coliving.lol/fonts/AvenirNextLTPro-Demi-Bold.ttf) format("truetype"), url(https://download.coliving.lol/fonts/AvenirNextLTPro-Demi-Bold.otf) format("opentype");
    }

    @font-face {
      font-family: 'Avenir Next LT Pro';
      font-style: normal;
      font-weight: 700;
      src: url(https://download.coliving.lol/fonts/AvenirNextLTPro-Bold.ttf) format("truetype"), url(https://download.coliving.lol/fonts/AvenirNextLTPro-Bold.otf) format("opentype");
    }

    @font-face {
      font-family: 'Avenir Next LT Pro';
      font-style: normal;
      font-weight: 900;
      src: url(https://download.coliving.lol/fonts/AvenirNextLTPro-Heavy.ttf) format("truetype"), url(https://download.coliving.lol/fonts/AvenirNextLTPro-Heavy.otf) format("opentype");
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 950;
      src: url(https://download.coliving.lol/fonts/Gilroy-Black.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-Black.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 900;
      src: url(https://download.coliving.lol/fonts/Gilroy-Heavy.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-Heavy.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 800;
      src: url(https://download.coliving.lol/fonts/Gilroy-ExtraBold.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-ExtraBold.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 700;
      src: url(https://download.coliving.lol/fonts/Gilroy-Bold.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-Bold.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 600;
      src: url(https://download.coliving.lol/fonts/Gilroy-SemiBold.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-SemiBold.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 500;
      src: url(https://download.coliving.lol/fonts/Gilroy-Medium.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-Medium.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 400;
      src: url(https://download.coliving.lol/fonts/Gilroy-Regular.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-Regular.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 300;
      src: url(https://download.coliving.lol/fonts/Gilroy-Light.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-Light.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 200;
      src: url(https://download.coliving.lol/fonts/Gilroy-UltraLight.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-UltraLight.otf) format('opentype')
    }

    @font-face {
      font-family: 'Gilroy';
      font-style: normal;
      font-weight: 100;
      src: url(https://download.coliving.lol/fonts/Gilroy-Thin.ttf) format('truetype'), url(https://download.coliving.lol/fonts/Gilroy-Thin.otf) format('opentype')
    }

    .gilroy { 
      font-family: 'Gilroy';
    }
    .avenir {
      font-family: 'Avenir Next LT Pro';
    }

` }} />
  )
}

export default FontStyles
