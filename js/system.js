/**
 * Globals
 */
var timeInterval = 15;//minutes
var minimumTaken = 59; //minutes which would be used as default for setting taken if not taken is given.
var opening_time_evening = new Date(1, 1, 1, 18, 0);
var closing_time_evening = new Date(1, 1, 1, 22, 0);

var opening_time_morning = new Date(1, 1, 1, 11, 0);
var closing_time_morning = new Date(1, 1, 1, 14, 0);


var app = angular.module('reservation.directives', []);


app.directive('timebtn', function () {
    return {
        link: function ($scope, element, attrs) {
            $scope.times = generateTimeInterval(attrs.shift);
            console.log($scope.times);
        },
        template: "<span ng-repeat='t in times' ng-click='setTime(t)' class='btn btn-info btn-sm'>{{::t|date:'HH:mm'}}</span> "
    }
});


app.directive("timeTable", function ($filter) {
    return {
        replace: 'AE',
        link: function ($scope, element, attrs) {
            $scope.$watch('r.time_from', function (value) {
                element.html('');
                make();
                element.find('[data-toggle="tooltip"]').tooltip();
            });
            $scope.$watch('r.time_to', function (value) {
                element.html('');
                make();
                element.find('[data-toggle="tooltip"]').tooltip();
            });
            var make = function () {
                var tf = strToDate(attrs.takenFrom);
                var tt = strToDate(attrs.takenTo);

                var morning_str = generateTimeBox(opening_time_morning, closing_time_morning, tf, tt);
                var evening_str = generateTimeBox(opening_time_evening, closing_time_evening, tf, tt);
                morning_str.append($('<span>', {style: 'width:40px;display:inline-block;'}));
                var full_str = morning_str.append(evening_str.html());
                element.append(full_str.html());
            }
        },
        template: '<div></div>'
    };
});

app.filter('range', function () {
    return function (input, min, max) {
        min = parseInt(min); //Make string input int
        max = parseInt(max);
        for (var i = min; i < max; i++)
            input.push(i);
        return input;
    };
});

/**
 * Converts a time with format xx:xx to date object
 */
function strToDate(timeStr) {
    var ts = timeStr.split(':');
    if (ts.length > 1) {
        return new Date(1, 1, 1, ts[0], ts[1]);
    }
    return null;

}


function timeBoxClick(caller) {

}


//generates time interval for OUR restaurant in the given shift.
function generateTimeInterval(shift) {
    console.log(shift);
    if (shift == 'morning') {
        var opening = opening_time_morning;
        var closing = closing_time_morning;
    } else {
        var opening = opening_time_evening;
        var closing = closing_time_evening;
    }
    var times = [];

    var madeTime = opening;

    while (madeTime <= closing) {
        times.push(madeTime);
        madeTime = new Date(madeTime.getTime() + 15 * 60000); //adding 15 minutes
    }
    return times;
}


function generateTimeBox(opening, closing, takenFrom, takenTo) {
    var rString = $('<div>', {});
    var madeTime = opening;

    if (takenFrom != undefined && !(takenTo instanceof Date)) {
        takenTo = new Date(takenFrom.getTime() + (3.5 * 60 * 60000));//4
    }

    var classPrefix = '';
    while (madeTime <= closing) {
        var min = ('0' + madeTime.getMinutes()).slice(-2);
        var madeStr = madeTime.getHours() + ":" + min;
        if (madeTime.getMinutes() == 0) {// || madeTime.getMinutes() == 30
            rString.append('<span class="timeSeperater" title="' + madeStr + '"><p>' + madeStr + '</p></span>');
        }
        if (madeTime >= takenFrom && madeTime <= takenTo) {
            classPrefix = 'taken';
        } else {
            classPrefix = '';
        }
        rString.append('<span tvalue="' + madeStr + '" title="' + madeStr + '" data-toggle="tooltip" onclick="timeBoxClick(this);" data-placement="top" class="' + classPrefix + ' timeBox"></span>');
        madeTime = new Date(madeTime.getTime() + 15 * 60000); //adding 15 minutes
    }
    return rString;
}
