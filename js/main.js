/// <reference path="../typings/angularjs/angular.d.ts"/>
var app = angular.module('reservation', ['reservation.directives', 'ui.bootstrap.modal']);
app.controller("ReservationsCtrl", function ($scope, $modal, reservations, $filter) {
    $scope.reservations = [];
    $scope.today = new Date();
    $scope.selectedDate = new Date();
    $scope.$watch('selectedDate', function () {
        $scope.load($scope.selectedDate);
    });
    //sort order
    $scope.asc = true;
    $scope.orderres = function (field) {
        $scope.reservations = $filter('orderBy')($scope.reservations, field, $scope.asc);
        $scope.asc = !$scope.asc;
    };

    $scope.persons = function () {
        var count = 0;
        if ($scope.reservations != undefined) {
            for (var i = 0; i < $scope.reservations.length; i++) {
                count += parseInt($scope.reservations[i].people);
            }
        }
        return count;
    };

    $scope.load = function (date) {
        $scope.selectedDate = date;
        reservations.reservations(date).then(function (revs) { //TODO Date
            $scope.reservations = revs;
        });
        reservations.upcomingDates().then(function (result) {
            $scope.dates = [];
            $scope.dates = result;
        });
    };

    $scope.lastEdited = null;
    $scope.selected = null;
    //edit or add reservation
    $scope.manage = function (r) {
        var modalInstance = $modal.open({
            animation: true,
            templateUrl: 'template/manageReservation.html',
            controller: 'ManageReservationCtrl',
            size: 'lg',
            resolve: {
                selectedDate: function () {
                    return $scope.selectedDate;
                },
                reservation: function () {
                    $scope.selected = r;
                    return angular.copy(r);
                }
            }
        });
        $scope.selected = r;
        modalInstance.result.then(function (result) {
            var added = false;
            if ($scope.reservations != undefined) {
                for (var i = 0; i < $scope.reservations.length; i++) {
                    if (angular.equals($scope.reservations[i], $scope.selected)) {
                        $scope.reservations[i] = result;
                        reservations.editReservation(result);
                        added = true;
                        break;
                    }
                }
            }
            if (!added) {
                reservations.addReservation(result);
                $scope.reservations.push(result);
            }
            $scope.lastEdited = result;
            $scope.selectedDate = $scope.lastEdited.date;
            $scope.selected = null;
        });
    };


    $scope.delete = function (reservation) {
        if (confirm('Delete reservation for ' + reservation.name)) {
            if (reservation.id != null) {
                reservations.deleteReservation(reservation.id);
                $scope.lastEdited = null;
            }
            var idx = $scope.reservations.indexOf(reservation);
            $scope.reservations.splice(idx, 1);
        }
    };
});


app.controller('ManageReservationCtrl', function ($scope, $modalInstance, reservation, selectedDate) {
    $scope.original = reservation;
    $scope.r = reservation;
    if (reservation == null && selectedDate != undefined) {
        $scope.r = {};
        $scope.r.date = selectedDate;
    }
    $scope.timetable = generator('Morning').concat(generator('Evening'));
    $scope.ohours = [
        {time: '11:30', shift: 'Morning'},
        {time: '12:20', shift: 'Evening'}
    ];
    $scope.close = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.save = function () {
        $modalInstance.close($scope.r);
    }
    $scope.toggleArrived = function () {
        $scope.r.arrived = !$scope.r.arrived;
    }
});


app.factory('reservations', function ($q, $filter) {
    var db = openDatabase("reservations", 1, "reservations", 1024 * 1024 * 3, function () {
        //new database created.
        db.transaction(function (tx) {
            tx.executeSql("CREATE TABLE res(id UNIQUE,date,reservation)");
        });
    });
    return {
        upcomingDates: function () {
            var defer = $q.defer();
            var dates = [];
            db.transaction(function (tx) {
                tx.executeSql("SELECT date AS dt,count(rowid) AS aantal FROM res WHERE dt >= ? GROUP BY dt ORDER BY dt", [$filter('date')(new Date(), 'yyyy-MM-dd')], function (t, resultSet) {

                    if (resultSet.rows.length > 0) {
                        for (var i = 0; i < resultSet.rows.length; i++) {
                            var resRow = resultSet.rows.item(i);
                            dates.push({'date': new Date(resRow.dt), 'count': resRow.aantal});
                        }
                    }
                    defer.resolve(dates);
                }, function (t, err) {
                    defer.resolve([]);
                    alert("Error receiving data from database. " + err.message);
                    console.log(err);
                });
            });
            return defer.promise;
        },
        reservations: function (date) {
            var defer = $q.defer();
            var revs = [];
            db.transaction(function (tx) {
                tx.executeSql("SELECT rowid,date,reservation FROM res WHERE date =?", [
                    $filter('date')(date, "yyyy-MM-dd")
                ], function (t, resultSet) {
                    if (resultSet.rows.length > 0) {
                        for (var i = 0; i < resultSet.rows.length; i++) {
                            var resRow = resultSet.rows.item(i);
                            var reservation = resRow.reservation;
                            reservation = JSON.parse(reservation);
                            delete reservation.$$hashKey;
                            reservation.id = resRow.rowid;
                            reservation.date = new Date(resRow.date);
                            revs.push(reservation);
                        }
                    }
                    defer.resolve(revs);
                }, function (t, err) {
                    defer.resolve([]);
                    alert("Error receiving data from database. " + err.message);
                    console.log(err);
                });
            });
            return defer.promise;
        },
        addReservation: function (reservation) {
            db.transaction(function (tx) {
                tx.executeSql("INSERT INTO res(date,reservation) VALUES (?,?)", [
                    $filter('date')(reservation.date, "yyyy-MM-dd"), JSON.stringify(reservation)
                ], function (t, resultset) {
                    console.log(resultset);
                    reservation.id = resultset.insertId;
                }, function (t, err) {
                    alert('Error adding reservation. ' + err.message);
                    console.log(err);
                });
            });

        },
        editReservation: function (reservation) {
            db.transaction(function (tx) {
                tx.executeSql("UPDATE res SET date=? ,reservation=? WHERE rowid=?", [
                    $filter('date')(reservation.date, "yyyy-MM-dd"), JSON.stringify(reservation), reservation.id
                ], null, function (t, err) {
                    alert('Error editing reservation. ', err.message);
                    console.log(err);
                });
            });
        },
        deleteReservation: function (id) {
            db.transaction(function (tx) {
                tx.executeSql("DELETE FROM res WHERE rowid=?", [
                    id
                ], null, function (t, err) {
                    alert('Error deleting reservation. ', err.message);
                    console.log(err);
                });
            });
        },
        cleanOld: function () {
            db.executeSql("Delete from res where date <?"[$filter('date')(new Date(), "yyyy-MM-dd")]);
        }
    };
});

function generator(shift) {
    if (shift == 'Morning') {
        var opening = opening_time_morning;
        var closing = closing_time_morning;
    } else {
        var opening = opening_time_evening;
        var closing = closing_time_evening;
    }
    var times = [];

    var madeTime = opening;

    while (madeTime <= closing) {
        times.push({time: madeTime, shift: shift});
        madeTime = new Date(madeTime.getTime() + 15 * 60000); //adding 15 minutes
    }
    return times;
}