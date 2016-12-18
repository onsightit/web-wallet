define(['knockout'], function(ko){
    ko.bindingHandlers.numericText = {
        update: function(element, valueAccessor, allBindingsAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor()),
            precision = ko.utils.unwrapObservable(allBindingsAccessor().precision) 
                || ko.bindingHandlers.numericText.defaultPrecision, formattedValue = value.toFixed(precision);

            ko.bindingHandlers.text.update(element, function() { return formattedValue; });
        },
        defaultPrecision: 1
    };
});
