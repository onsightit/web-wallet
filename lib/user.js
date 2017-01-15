var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var userSchema = mongoose.Schema({
	local: {
		id: String,
		password: String,
		changeme: Boolean
	},
	facebook: {
		id: String,
		token: String
	},
	google: {
		id: String,
		token: String
	},
	twitter: {
		id: String,
		token: String
	},
	profile: {
		login_type: String,
		last_login: Date,
		role: String,
		credit: Number,
		first_name: String,
		last_name: String,
		employer: String,
		email: String,
		description: String,
		age: Number,
		dob: Date,
		gender: String,
		ethnicity: String,
		country: String,
		terms: Boolean
	},
	wallet: [
			{ node_id: String, account: String, address: String }
			]
});

userSchema.methods.generateHash = function(password){
	return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
};

userSchema.methods.validPassword = function(password){
	return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model('User', userSchema);
