module.exports = function(appHost, chRoot){
	var auth = {
		'facebookAuth' : {
			'clientID': '1287387224619327',
			'clientSecret': 'c50f7c243605ed8ea8be3ecb4149df45',
			'callbackURL': 'https://' + appHost + chRoot + '/auth/facebook/callback'
		},
	
		'googleAuth' : {
			'clientID': '926349154416-i8ntj679c4td8aet9eujinfid2a1vmd2.apps.googleusercontent.com',
			'clientSecret': 'SjDN6jPeXBEURCB98ieg8R5F',
			'callbackURL': 'https://' + appHost + chRoot + '/auth/google/callback'
		},
	
		'twitterAuth' : {
			'consumerKey': 'eFvIGtga2FR4v1w28z2uqxXdq',
			'consumerSecret': 'FeYqsV8AoHx8N6c84tt6ksvSqrgXBAZ5RjArUT8qqcsAsoZpnb',
			'callbackURL': 'https://' + appHost + chRoot + '/auth/twitter/callback'
	    }
    };
	return auth;
};
