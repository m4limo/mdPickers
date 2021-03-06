(function() {
    'use strict';

    angular
        .module('mdPickers')
        .directive('mdpDatePicker', mdpDatePicker);

    /** @ngInject */
    function mdpDatePicker($mdpDatePicker, $timeout, mdpDatePickerService) {

        var directive = {
            restrict: 'E',
            require: 'ngModel',
            transclude: true,
            template: function(element, attrs) {
                var noFloat = angular.isDefined(attrs.mdpNoFloat),
                    placeholder = angular.isDefined(attrs.mdpPlaceholder) ? attrs.mdpPlaceholder : "",
                    openOnClick = angular.isDefined(attrs.mdpOpenOnClick) ? true : false;

                return '<div layout layout-align="start start">' +
                            '<md-button ng-disabled="disabled" class="md-icon-button" ng-click="showPicker($event)">' +
                                '<md-icon md-svg-icon="mdp-event"></md-icon>' +
                            '</md-button>' +
                            '<md-input-container' + (noFloat ? ' md-no-float' : '') + ' ng-model="model" md-is-error="isError()" flex>' +
                                '<input ng-disabled="disabled" type="{{ type }}" aria-label="' + placeholder + '" placeholder="' + placeholder + '"' + (openOnClick ? ' ng-click="showPicker($event)" ' : '') + ' />' +
                            '</md-input-container>' +
                        '</div>';
            },
            scope: {
                'minDate': '=mdpMinDate',
                'maxDate': '=mdpMaxDate',
                'dateFilter': '=mdpDateFilter',
                'dateFormat': '@mdpFormat',
                'placeholder': '@mdpPlaceholder',
                'noFloat': '=mdpNoFloat',
                'openOnClick': '=mdpOpenOnClick',
                'disabled': '=?mdpDisabled'
            },
            link: {
                post: postLink
            }
        };

        return directive;

        function postLink(scope, element, attrs, ngModel, $transclude) {
            var inputElement = angular.element(element[0].querySelector('input')),
                inputContainer = angular.element(element[0].querySelector('md-input-container')),
                inputContainerCtrl = inputContainer.controller('mdInputContainer');

            $transclude(function(clone) {
                inputContainer.append(clone);
            });

            var messages = angular.element(inputContainer[0].querySelector('[ng-messages]'));

            scope.type = scope.dateFormat ? 'text' : 'date';
            scope.dateFormat = scope.dateFormat || 'YYYY-MM-DD';
            scope.model = ngModel;

            if (!angular.isDefined(scope.disabled)) {
                scope.disabled = attrs.hasOwnProperty('mdpDisabled');
            }

            function updateView (newValue) {
                if (angular.isDefined(newValue)) {
                    ngModel.$validate();
                }
            }

            scope.$watch('minDate', updateView);
            scope.$watch('maxDate', updateView);
            scope.$watch('dateFilter', updateView);

            scope.isError = function() {
                return !ngModel.$pristine && !!ngModel.$invalid;
            };

            // update input element if model has changed
            ngModel.$formatters.unshift(function(value) {
                var localValue = angular.copy(value);
                var date = angular.isDate(localValue) && moment(localValue);
                updateInputElement(
                    date && date.isValid() ? date.format(scope.dateFormat) : ''
                );
                ngModel.$validate();
            });

            ngModel.$validators.format = function(modelValue, viewValue) {
                return mdpDatePickerService.formatValidator(viewValue, scope.dateFormat);
            };

            ngModel.$validators.minDate = function(modelValue, viewValue) {
                return mdpDatePickerService.minDateValidator(viewValue, scope.dateFormat, scope.minDate);
            };

            ngModel.$validators.maxDate = function(modelValue, viewValue) {
                return mdpDatePickerService.maxDateValidator(viewValue, scope.dateFormat, scope.maxDate);
            };

            ngModel.$validators.filter = function(modelValue, viewValue) {
                return mdpDatePickerService.filterValidator(viewValue, scope.dateFormat, scope.dateFilter);
            };

            ngModel.$validators.required = function(modelValue, viewValue) {
                if (angular.isDefined(modelValue) && !angular.isDefined(viewValue)) {
                    updateDate(modelValue);
                }
                return mdpDatePickerService.requiredValidator(viewValue, attrs.required);
            };


            ngModel.$parsers.unshift(function(value) {
                var parsed = moment(value, scope.dateFormat, true);
                if (parsed.isValid()) {
                    if (angular.isDate(ngModel.$modelValue)) {
                        var originalModel = moment(ngModel.$modelValue);
                        originalModel.year(parsed.year());
                        originalModel.month(parsed.month());
                        originalModel.date(parsed.date());

                        parsed = originalModel;
                    }
                    return parsed.toDate();
                } else {
                    return angular.isDate(ngModel.$modelValue) ? ngModel.$modelValue : null;
                }
            });

            // update input element value
            function updateInputElement(value) {
                if (ngModel.$valid && value && value.length) {
                    inputElement[0].size = value.length + 1;
                }
                inputElement[0].value = value;
                inputContainerCtrl.setHasValue(!ngModel.$isEmpty(value));
            }

            function updateDate(date) {
                if (date) {
                    if (angular.isDate(date)) {
                        date = moment(date).format(scope.dateFormat);
                    }
                    var value = moment.isMoment(date) ? date.format(scope.dateFormat) : date;

                    ngModel.$setViewValue(value);
                    updateInputElement(value);
                } else {
                    ngModel.$setViewValue('');
                }

                if (!ngModel.$pristine &&
                    messages.hasClass('md-auto-hide') &&
                    inputContainer.hasClass('md-input-invalid')) {
                    messages.removeClass('md-auto-hide');
                }

                ngModel.$render();
            }

            scope.showPicker = function(ev) {
                $mdpDatePicker(ngModel.$modelValue, {
                    minDate: scope.minDate,
                    maxDate: scope.maxDate,
                    dateFilter: scope.dateFilter,
                    targetEvent: ev
                }).then(updateDate);
            };

            function onInputElementEvents(event) {
                if (event.target.value !== ngModel.$viewValue) {
                    updateDate(event.target.value);
                }
            }

            inputElement.on('reset input blur', onInputElementEvents);

            scope.$on('$destroy', function() {
                inputElement.off('reset input blur', onInputElementEvents);
            });
        }
    }

})();
