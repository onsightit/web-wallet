define(function(){
    return {
        // TODO: replace [H] with whatever is in [settings.coinChar]
        coin: /^[H][a-km-zA-HJ-NP-Z0-9]{33}$/,       // base64, 34 chars begining with your coin address's first character (e.g. 'H')
        foo: "bar"
    };
});
