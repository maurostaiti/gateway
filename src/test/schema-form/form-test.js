require('../jsdom-common');
const {fireEvent, createSchemaForm} = require('./test-utils');

/* globals sandbox */

describe('Form', () => {
  describe('Empty schema', () => {
    it('should render a form', () => {
      const {node} = createSchemaForm({schema: {}});

      expect(node.nodeName).toEqual('FORM');
    });

    it('should render a submit button', () => {
      const {node} = createSchemaForm({schema: {}});

      expect(node.querySelectorAll('button[class=addon-config-button-apply]'))
        .toHaveLength(1);
    });
  });

  describe('Schema definitions', () => {
    it('should use a single schema definition reference', () => {
      const schema = {
        definitions: {
          testdef: {type: 'string'},
        },
        $ref: '#/definitions/testdef',
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelectorAll('input[type=text]')).toHaveLength(1);
    });

    it('should handle multiple schema definition references', () => {
      const schema = {
        definitions: {
          testdef: {type: 'string'},
        },
        type: 'object',
        properties: {
          foo: {$ref: '#/definitions/testdef'},
          bar: {$ref: '#/definitions/testdef'},
        },
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelectorAll('input[type=text]')).toHaveLength(2);
    });

    it('should handle deeply referenced schema definitions', () => {
      const schema = {
        definitions: {
          testdef: {type: 'string'},
        },
        type: 'object',
        properties: {
          foo: {
            type: 'object',
            properties: {
              bar: {$ref: '#/definitions/testdef'},
            },
          },
        },
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelectorAll('input[type=text]')).toHaveLength(1);
    });

    it('should handle references to deep schema definitions', () => {
      const schema = {
        definitions: {
          testdef: {
            type: 'object',
            properties: {
              bar: {type: 'string'},
            },
          },
        },
        type: 'object',
        properties: {
          foo: {$ref: '#/definitions/testdef/properties/bar'},
        },
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelectorAll('input[type=text]')).toHaveLength(1);
    });

    it('should handle referenced definitions for array items', () => {
      const schema = {
        definitions: {
          testdef: {type: 'string'},
        },
        type: 'object',
        properties: {
          foo: {
            type: 'array',
            items: {$ref: '#/definitions/testdef'},
          },
        },
      };

      const {node} = createSchemaForm({
        schema,
        formData: {
          foo: ['blah'],
        },
      });

      expect(node.querySelectorAll('input[type=text]')).toHaveLength(1);
    });

    it('should raise for non-existent definitions referenced', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: {$ref: '#/definitions/nonexistent'},
        },
      };

      expect(() => createSchemaForm({schema})).toThrow(
        Error,
        /#\/definitions\/nonexistent/
      );
    });

    it('should propagate referenced definition defaults', () => {
      const schema = {
        definitions: {
          testdef: {type: 'string', default: 'hello'},
        },
        $ref: '#/definitions/testdef',
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelector('input[type=text]').value).toEqual('hello');
    });

    it('should propagate nested referenced definition defaults', () => {
      const schema = {
        definitions: {
          testdef: {type: 'string', default: 'hello'},
        },
        type: 'object',
        properties: {
          foo: {$ref: '#/definitions/testdef'},
        },
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelector('input[type=text]').value).toEqual('hello');
    });

    it('should propagate referenced definition defaults for array items',
       () => {
         const schema = {
           definitions: {
             testdef: {type: 'string', default: 'hello'},
           },
           type: 'array',
           items: {
             $ref: '#/definitions/testdef',
           },
         };

         const {node} = createSchemaForm({schema});

         node.querySelector('.btn-add').click();

         expect(node.querySelector('input[type=text]').value).toEqual('hello');
       });

    it('should recursively handle referenced definitions', () => {
      const schema = {
        $ref: '#/definitions/node',
        definitions: {
          node: {
            type: 'object',
            properties: {
              name: {type: 'string'},
              children: {
                type: 'array',
                items: {
                  $ref: '#/definitions/node',
                },
              },
            },
          },
        },
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelector('#root_children_0_name')).toBeNull();

      node.querySelector('.btn-add').click();

      expect(node.querySelector('#root_children_0_name')).not.toBeNull();
    });

    it('should priorize definition over schema type property', () => {
      const schema = {
        type: 'object',
        properties: {
          name: {type: 'string'},
          childObj: {
            type: 'object',
            $ref: '#/definitions/childObj',
          },
        },
        definitions: {
          childObj: {
            type: 'object',
            properties: {
              otherName: {type: 'string'},
            },
          },
        },
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelectorAll('input[type=text]')).toHaveLength(2);
    });

    it('should priorize local properties over definition ones', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: {
            title: 'custom title',
            $ref: '#/definitions/objectDef',
          },
        },
        definitions: {
          objectDef: {
            type: 'object',
            title: 'definition title',
            properties: {
              field: {type: 'string'},
            },
          },
        },
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelector('#root_foo__title').textContent.trim())
        .toEqual('custom title');
    });

    it('should propagate and handle a resolved schema definition', () => {
      const schema = {
        definitions: {
          enumDef: {type: 'string', enum: ['a', 'b']},
        },
        type: 'object',
        properties: {
          name: {$ref: '#/definitions/enumDef'},
        },
      };

      const {node} = createSchemaForm({schema});

      expect(node.querySelectorAll('option')).toHaveLength(3);
    });
  });

  describe('Default value handling on clear', () => {
    const schema = {
      type: 'string',
      default: 'foo',
    };

    it('should not set default when a text field is cleared', () => {
      const {node} = createSchemaForm({schema, formData: 'bar'});

      const input = node.querySelector('input');
      input.value = '';
      fireEvent(input, 'change');

      expect(node.querySelector('input').value).toEqual('');
    });
  });

  describe('Defaults array items default propagation', () => {
    const schema = {
      type: 'object',
      title: 'lvl 1 obj',
      properties: {
        object: {
          type: 'object',
          title: 'lvl 2 obj',
          properties: {
            array: {
              type: 'array',
              items: {
                type: 'object',
                title: 'lvl 3 obj',
                properties: {
                  bool: {
                    type: 'boolean',
                    default: true,
                  },
                },
              },
            },
          },
        },
      },
    };

    it('should propagate deeply nested defaults to form state', () => {
      const {schemaForm, node} = createSchemaForm({schema});

      node.querySelector('.btn-add').click();

      expect(schemaForm.formData).toEqual({
        object: {
          array: [
            {
              bool: true,
            },
          ],
        },
      });
    });
  });


  describe('Apply button handler', () => {
    it('should not call apply handler before change form state',
       () => {
         const schema = {
           type: 'object',
           properties: {
             foo: {type: 'string'},
           },
         };
         const formData = {
           foo: 'bar',
         };

         const {node} = createSchemaForm({
           schema,
           formData,
         });

         expect(node.querySelector('.addon-config-button-apply').disabled)
           .toBeTruthy();
       });

    it('should call apply handler', (done) => {
      const schema = {
        type: 'object',
        properties: {
          foo: {type: 'string'},
        },
      };

      const {node} = createSchemaForm({
        schema,
      });

      const input = node.querySelector('input');
      input.value = 'bar';
      fireEvent(input, 'change');

      sandbox.stub(console, 'error').callsFake((error) => {
        expect(error).toContain('fetch is not defined');
        done();
      });

      node.querySelector('.addon-config-button-apply').click();
    });

    it('should call scrollToTop on validation errors', () => {
      const schema = {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
            minLength: 8,
          },
        },
      };

      const {schemaForm, node} = createSchemaForm({
        schema,
      });

      const input = node.querySelector('input');
      input.value = 'short';
      fireEvent(input, 'change');

      sandbox.spy(schemaForm, 'scrollToTop');

      node.querySelector('.addon-config-button-apply').click();

      expect(schemaForm.scrollToTop.calledOnce).toBeTruthy();
      expect(node.querySelector('.addon-config-button-apply').disabled)
        .toBeTruthy();
    });
  });

  describe('Error contextualization', () => {
    describe('root level', () => {
      it('should denote the error in the field', () => {
        const schema = {
          type: 'string',
          minLength: 8,
        };
        const {node} = createSchemaForm({schema});

        const input = node.querySelector('input');
        input.value = 'short';
        fireEvent(input, 'change');

        expect(node.querySelectorAll('.errors-list')).toHaveLength(1);
        expect(
          node.querySelector('.error-item').textContent.trim()
        ).toContain('should NOT be shorter than 8 characters');
      });
    });

    describe('root level with multiple errors', () => {
      it('should denote the error in the field', () => {
        const schema = {
          type: 'string',
          minLength: 8,
          pattern: 'd+',
        };
        const {node} = createSchemaForm({schema});

        const input = node.querySelector('input');
        input.value = 'short';
        fireEvent(input, 'change');

        const liNodes = node.querySelectorAll('.error-item');
        const errors = [].map.call(liNodes, (li) => li.textContent.trim());

        expect(errors).toEqual([
          'should NOT be shorter than 8 characters',
          'should match pattern "d+"',
        ]);
      });
    });

    describe('nested field level', () => {
      it('should denote the error in the field', () => {
        const schema = {
          type: 'object',
          properties: {
            level1: {
              type: 'object',
              properties: {
                level2: {
                  type: 'string',
                  minLength: 8,
                },
              },
            },
          },
        };
        const {node} = createSchemaForm({schema});

        const input = node.querySelector('input');
        input.value = 'short';
        fireEvent(input, 'change');

        expect(node.querySelectorAll('.errors-list')).toHaveLength(1);
        expect(node.querySelector('.error-item').textContent.trim()).toEqual(
          '.level1.level2 should NOT be shorter than 8 characters'
        );
      });
    });

    describe('schema dependencies', () => {
      const schema = {
        type: 'object',
        properties: {
          branch: {
            type: 'number',
            enum: [1, 2, 3],
            default: 1,
          },
        },
        required: ['branch'],
        dependencies: {
          branch: {
            oneOf: [
              {
                properties: {
                  branch: {
                    enum: [1],
                  },
                  field1: {
                    type: 'number',
                  },
                },
                required: ['field1'],
              },
              {
                properties: {
                  branch: {
                    enum: [2],
                  },
                  field1: {
                    type: 'number',
                  },
                  field2: {
                    type: 'number',
                  },
                },
                required: ['field1', 'field2'],
              },
            ],
          },
        },
      };

      it('should only show error for property in selected branch', () => {
        const {node} = createSchemaForm({
          schema,
        });

        const input = node.querySelector('input[type=text]');
        input.value = 'not a number';
        fireEvent(input, 'change');

        expect(node.querySelector('.error-item').textContent.trim()).toEqual(
          '.field1 should be number',
        );
      });

      it('should only show errors for properties in selected branch', () => {
        const {node} = createSchemaForm({
          schema,
          formData: {branch: 2},
        });

        const input = node.querySelector('input[type=text]');
        input.value = 'not a number';
        fireEvent(input, 'change');

        const liNodes = node.querySelectorAll('.error-item');
        const errors = [].map.call(liNodes, (li) => li.textContent.trim());

        expect(errors).toEqual(expect.arrayContaining([
          '.field1 should be number',
          '.field2 is a required property',
        ]));
      });

      it('should show errors when branch is other than oneOf', () => {
        const {node} = createSchemaForm({
          schema,
        });

        const select = node.querySelector('select');
        select.value = 3;
        fireEvent(select, 'change');

        const liNodes = node.querySelectorAll('.error-item');
        const errors = [].map.call(liNodes, (li) => li.textContent.trim());

        expect(errors).toEqual(expect.arrayContaining([
          '.branch should be equal to one of the allowed values',
        ]));
      });
    });
  });


  describe('idSchema updates based on formData', () => {
    const schema = {
      type: 'object',
      properties: {
        a: {type: 'string', enum: ['int', 'bool']},
      },
      dependencies: {
        a: {
          oneOf: [
            {
              properties: {
                a: {enum: ['int']},
              },
            },
            {
              properties: {
                a: {enum: ['bool']},
                b: {type: 'boolean'},
              },
            },
          ],
        },
      },
    };

    it('should not update id for a falsey value', () => {
      const formData = {a: 'int'};
      const {node} = createSchemaForm({schema, formData});

      const inputs = node.querySelectorAll('select, input');
      const ids = [].map.call(inputs, (input) => input.id);

      expect(ids).toEqual([
        'root_a',
      ]);
    });

    it('should update id based on truthy value', () => {
      const formData = {a: 'int'};
      const {node} = createSchemaForm({schema, formData});

      const select = node.querySelector('select');
      select.value = 'bool';
      fireEvent(select, 'change');

      const inputs = node.querySelectorAll('select, input');
      const ids = [].map.call(inputs, (input) => input.id);

      expect(ids).toEqual([
        'root_a',
        'root_b',
      ]);
    });
  });
});
